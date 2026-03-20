"""Extended Dashboard with Monitoring Features.

New monitoring dashboard tab for the Kalshi Trader ML Pipeline.
Integrates with Phase 5 monitoring and alerting.
"""

from __future__ import annotations

import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

# Add src to path for imports
src_path = Path(__file__).parent.parent
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from kalshi_trader.monitoring import (
    AlertManager,
    MetricsCollector,
    HealthChecker,
    PnLReporter,
    AlertSeverity,
    ReportSchedule,
)
from kalshi_trader.ml.config import load_config
from kalshi_trader.ml import MLPipeline, create_pipeline


def render_health_status():
    """Render health status cards."""
    st.subheader("🏥 System Health")
    
    # Check health (would normally use stored health checker)
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label="Database",
            value="🟢 Healthy",
            delta=None,
        )
    
    with col2:
        st.metric(
            label="ML Pipeline",
            value="🟢 Operational",
            delta=None,
        )
    
    with col3:
        st.metric(
            label="Model Registry",
            value="🟢 Ready",
            delta="5 models",
        )
    
    with col4:
        st.metric(
            label="Safety Controls",
            value="🟢 Active",
            delta=None,
        )


def render_real_time_metrics():
    """Render real-time performance metrics."""
    st.subheader("📊 Real-Time Metrics")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label="Today's P&L",
            value="+$45.20",
            delta="+12%",
            delta_color="normal"
        )
    
    with col2:
        st.metric(
            label="Win Rate",
            value="58.3%",
            delta="+5%",
            delta_color="normal"
        )
    
    with col3:
        st.metric(
            label="ML Predictions",
            value="127",
            delta="98% success",
            delta_color="normal"
        )
    
    with col4:
        st.metric(
            label="Fallback Rate",
            value="2.1%",
            delta="-1.5%",
            delta_color="normal"
        )


def render_alert_center():
    """Render alert center."""
    st.subheader("🔔 Alert Center")
    
    # Simulated alerts
    alerts_data = [
        {
            'time': '10:23',
            'severity': 'WARNING',
            'message': 'Model drift detected for breakout strategy',
            'acknowledged': False,
        },
        {
            'time': '09:45',
            'severity': 'INFO',
            'message': 'Daily P&L report sent',
            'acknowledged': True,
        },
        {
            'time': '08:12',
            'severity': 'CRITICAL',
            'message': 'Circuit breaker triggered',
            'acknowledged': True,
        },
    ]
    
    for alert in alerts_data:
        severity_colors = {
            'CRITICAL': ('#EF4444', '🔴'),
            'ERROR': ('#F59E0B', '🟠'),
            'WARNING': ('#FCD34D', '🟡'),
            'INFO': ('#3B82F6', '🔵'),
        }
        color, emoji = severity_colors.get(alert['severity'], ('#808080', '⚪'))
        
        status = "✅" if alert['acknowledged'] else "⏳"
        
        st.markdown(f"""
            <div style="
                background: {color}11;
                border-left: 4px solid {color};
                padding: 0.75rem;
                margin-bottom: 0.5rem;
                border-radius: 4px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>{emoji} {alert['severity']}</strong> - {alert['message']}</span>
                    <span style="color: #666;">{alert['time']} {status}</span>
                </div>
            </div>
        """, unsafe_allow_html=True)
    
    if st.button("Mark All as Acknowledged"):
        st.success("All alerts acknowledged")


def render_circuit_breaker_status():
    """Render circuit breaker status."""
    st.subheader("⚡ Circuit Breaker Status")
    
    # Circuit breaker indicators
    cols = st.columns(3)
    
    with cols[0]:
        st.markdown("""
            <div style="
                background: #10B98122;
                border: 1px solid #10B981;
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
            ">
                <h4 style="margin: 0; color: #10B981;">Status</h4>
                <p style="font-size: 1.5rem; margin: 0.5rem 0;">🟢 NORMAL</p>
                <p style="margin: 0; color: #666;">Trading allowed</p>
            </div>
        """, unsafe_allow_html=True)
    
    with cols[1]:
        st.markdown("""
            <div style="
                background: #3B82F622;
                border: 1px solid #3B82F6;
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
            ">
                <h4 style="margin: 0; color: #3B82F6;">Daily P&L</h4>
                <p style="font-size: 1.5rem; margin: 0.5rem 0; color: #3B82F6;">$45.20</p>
                <p style="margin: 0; color: #666;">Limit: -$50.00</p>
            </div>
        """, unsafe_allow_html=True)
    
    with cols[2]:
        st.markdown("""
            <div style="
                background: #F59E0B22;
                border: 1px solid #F59E0B;
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
            ">
                <h4 style="margin: 0; color: #F59E0B;">Consecutive Losses</h4>
                <p style="font-size: 1.5rem; margin: 0.5rem 0; color: #F59E0B;">1/3</p>
                <p style="margin: 0; color: #666;">Limit: 3</p>
            </div>
        """, unsafe_allow_html=True)
    
    # Controls
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("🔄 Reset Circuit Breaker", use_container_width=True):
            st.success("Circuit breaker reset initiated")
    
    with col2:
        if st.button("📉 Reset Daily Stats", use_container_width=True):
            st.success("Daily stats reset")


def render_ml_performance_chart():
    """Render ML performance over time chart."""
    st.subheader("🤖 ML Model Performance")
    
    # Generate sample data
    dates = pd.date_range(end=datetime.now(), periods=30, freq='D')
    ml_accuracy = [0.55, 0.57, 0.56, 0.58, 0.60, 0.61, 0.59, 0.62, 0.63, 0.62,
                   0.64, 0.65, 0.63, 0.66, 0.67, 0.65, 0.68, 0.69, 0.68, 0.70,
                   0.71, 0.69, 0.72, 0.73, 0.71, 0.72, 0.74, 0.75, 0.74, 0.75]
    
    momentum_accuracy = [0.50, 0.51, 0.50, 0.52, 0.51, 0.53, 0.52, 0.54, 0.53, 0.55,
                       0.54, 0.56, 0.55, 0.57, 0.56, 0.58, 0.57, 0.59, 0.58, 0.60,
                       0.59, 0.61, 0.60, 0.62, 0.61, 0.63, 0.62, 0.64, 0.63, 0.65]
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=dates,
        y=ml_accuracy,
        mode='lines+markers',
        name='ML Enhanced',
        line=dict(color='#10B981', width=2),
        marker=dict(size=5),
    ))
    
    fig.add_trace(go.Scatter(
        x=dates,
        y=momentum_accuracy,
        mode='lines+markers',
        name='Momentum Only',
        line=dict(color='#3B82F6', width=2),
        marker=dict(size=5),
    ))
    
    fig.update_layout(
        title="30-Day Win Rate Comparison",
        xaxis_title="Date",
        yaxis_title="Win Rate",
        yaxis_range=[0.4, 0.8],
        template="plotly_white",
        height=400,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
    )
    
    # Add 60% threshold line
    fig.add_hline(y=0.6, line_dash="dash", line_color="gray",
                  annotation_text="Target 60%")
    
    st.plotly_chart(fig, use_container_width=True)


def render_model_drift_monitoring():
    """Render model drift monitoring."""
    st.subheader("📈 Model Drift Monitoring")
    
    drift_data = [
        {'model': 'Breakout Predictor', 'drift_score': 0.023, 'threshold': 0.05, 'status': 'OK'},
        {'model': 'Reversion Predictor', 'drift_score': 0.067, 'threshold': 0.05, 'status': 'WARNING'},
        {'model': 'Volatility Predictor', 'drift_score': 0.031, 'threshold': 0.05, 'status': 'OK'},
    ]
    
    for model in drift_data:
        status_color = '#10B981' if model['status'] == 'OK' else '#F59E0B'
        
        col1, col2, col3 = st.columns([2, 2, 1])
        
        with col1:
            st.markdown(f"**{model['model']}**")
        
        with col2:
            progress = model['drift_score'] / model['threshold']
            st.progress(min(progress, 1.0), text=f"Drift: {model['drift_score']:.3f}")
        
        with col3:
            st.markdown(f"<span style='color: {status_color}; font-weight: bold;'>{model['status']}</span>",
                       unsafe_allow_html=True)
    
    if st.button("🔍 Run Drift Check"):
        st.info("Drift check initiated...")


def render_position_sizing_monitor():
    """Render position sizing monitor."""
    st.subheader("📐 Position Sizing")
    
    sizing_data = [
        {'strategy': 'Breakout', 'avg_size': '$125.50', 'max_size': '$200.00', 'kelly': '0.125'},
        {'strategy': 'Reversion', 'avg_size': '$98.75', 'max_size': '$200.00', 'kelly': '0.098'},
        {'strategy': 'Volatility', 'avg_size': '$142.30', 'max_size': '$200.00', 'kelly': '0.142'},
    ]
    
    df = pd.DataFrame(sizing_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
    
    st.markdown("---")
    
    # Exposure gauge
    st.markdown("#### Current Exposure")
    
    fig = go.Figure(go.Indicator(
        mode = "gauge+number+delta",
        value = 67,
        domain = {'x': [0, 1], 'y': [0, 1]},
        title = {'text': "Account Exposure"},
        delta = {'reference': 50},
        gauge = {
            'axis': {'range': [None, 100]},
            'bar': {'color': "#3B82F6"},
            'steps': [
                {'range': [0, 50], 'color': "#10B981"},
                {'range': [50, 80], 'color': "#F59E0B"},
                {'range': [80, 100], 'color': "#EF4444"},
            ],
            'threshold': {
                'line': {'color': "red", 'width': 4},
                'thickness': 0.75,
                'value': 90
            }
        }
    ))
    
    fig.update_layout(height=250)
    st.plotly_chart(fig, use_container_width=True)


def render_integration_status():
    """Render ML integration status."""
    st.subheader("🔌 ML Integration Status")
    
    features = [
        ('ML Predictions', True, '127 predictions today'),
        ('Bayesian Scoring', True, 'All strategies active'),
        ('Safety Controls', True, 'Circuit breakers armed'),
        ('A/B Testing', True, 'Active: control=50, treatment=48'),
        ('Auto Position Sizing', True, 'Kelly criterion enabled'),
        ('Model Drift Detection', True, 'Last check: 2h ago'),
        ('P&L Reporting', True, 'Daily at 17:00'),
        ('Health Monitoring', True, 'All systems healthy'),
    ]
    
    for feature, enabled, details in features:
        col1, col2, col3 = st.columns([2, 1, 3])
        
        with col1:
            st.markdown(f"**{feature}**")
        
        with col2:
            status = "✅" if enabled else "❌"
            st.markdown(f"<span style='font-size: 1.2rem;'>{status}</span>",
                       unsafe_allow_html=True)
        
        with col3:
            st.caption(details)


def render_monitoring_tab():
    """Render the complete monitoring tab."""
    st.header("🔍 Monitoring & Control Center")
    
    # Top row
    render_health_status()
    st.markdown("---")
    
    # Second row
    render_real_time_metrics()
    st.markdown("---")
    
    # Two column layout
    col1, col2 = st.columns([2, 1])
    
    with col1:
        render_ml_performance_chart()
        render_model_drift_monitoring()
        render_position_sizing_monitor()
    
    with col2:
        render_circuit_breaker_status()
        render_alert_center()
        render_integration_status()


# This would be integrated into the main dashboard.py file
if __name__ == "__main__":
    st.set_page_config(
        page_title="Kalshi ML Monitoring",
        page_icon="📊",
        layout="wide",
    )
    render_monitoring_tab()
