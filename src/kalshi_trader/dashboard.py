"""Kalshi Trader ML Pipeline Dashboard.

Real-time visualization of confidence scores and A/B testing results.
Integrates with the existing Kalshi Trader system.

Usage:
    streamlit run kalshi_trader/dashboard.py

Or from project root:
    streamlit run src/kalshi_trader/dashboard.py
"""

from __future__ import annotations

import sys
from pathlib import Path
from datetime import datetime, timedelta
from time import sleep

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Add src to path for imports
src_path = Path(__file__).parent.parent
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from kalshi_trader.ml import ConfidenceScorer, ABTesting, MLDatabase
from kalshi_trader.ml.confidence_scorer import SuggestionType


# Page configuration
st.set_page_config(
    page_title="Kalshi Trader ML Pipeline",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)


def init_session_state():
    """Initialize Streamlit session state."""
    if "db" not in st.session_state:
        st.session_state.db = MLDatabase()
        st.session_state.db.initialize()
    
    if "scorer" not in st.session_state:
        st.session_state.scorer = ConfidenceScorer(db=st.session_state.db)
        st.session_state.scorer.initialize()
    
    if "ab" not in st.session_state:
        st.session_state.ab = ABTesting(db=st.session_state.db)
        st.session_state.ab.initialize()
        
    if "last_update" not in st.session_state:
        st.session_state.last_update = datetime.now()


def render_header():
    """Render page header."""
    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.title("🤖 Kalshi Trader ML Pipeline")
        st.markdown("**Phase 2: Confidence Scoring & A/B Testing Framework**")
    
    with col2:
        st.caption(f"Last updated: {st.session_state.last_update.strftime('%H:%M:%S')}")
        if st.button("🔄 Refresh"):
            st.rerun()


def render_confidence_scores(scorer: ConfidenceScorer):
    """Render confidence score cards."""
    st.subheader("📊 Confidence Scores")
    
    cols = st.columns(3)
    
    for idx, stype in enumerate(SuggestionType):
        with cols[idx]:
            result = scorer.get_confidence_detailed(stype.value)
            
            # Color based on confidence level
            if result.confidence >= 0.7:
                color = "#10B981"  # Green
                status = "High"
            elif result.confidence >= 0.5:
                color = "#F59E0B"  # Yellow
                status = "Moderate"
            else:
                color = "#EF4444"  # Red
                status = "Low"
            
            st.markdown(f"""
                <div style="
                    background: linear-gradient(135deg, {color}22 0%, {color}11 100%);
                    border-left: 4px solid {color};
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                ">
                    <h3 style="margin: 0; color: {color};">{stype.value.capitalize()}</h3>
                    <p style="font-size: 2rem; font-weight: bold; margin: 0;">{result.confidence:.1%}</p>
                    <p style="font-size: 0.9rem; color: #666; margin: 0;">Status: {status}</p>
                    <p style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">
                        Samples: {result.sample_size} | 
                        95% CI: [{result.credible_interval[0]:.1%}, {result.credible_interval[1]:.1%}]
                    </p>
                </div>
            """, unsafe_allow_html=True)


def render_confidence_trends(db: MLDatabase):
    """Render confidence trends over time."""
    st.subheader("📈 Confidence Trends")
    
    history = db.get_confidence_history(limit=100)
    
    if len(history) < 2:
        st.info("Not enough data yet. Trends will appear after several trades.")
        return
    
    df = pd.DataFrame(history)
    df['recorded_at'] = pd.to_datetime(df['recorded_at'])
    df = df.sort_values('recorded_at')
    
    fig = go.Figure()
    
    colors = {
        'reversion': '#3B82F6',
        'breakout': '#10B981', 
        'volatility': '#F59E0B'
    }
    
    for stype in ['reversion', 'breakout', 'volatility']:
        stype_data = df[df['suggestion_type'] == stype]
        if len(stype_data) > 0:
            fig.add_trace(go.Scatter(
                x=stype_data['recorded_at'],
                y=stype_data['confidence'],
                mode='lines+markers',
                name=stype.capitalize(),
                line=dict(color=colors.get(stype, '#666'), width=2),
                marker=dict(size=6)
            ))
    
    fig.update_layout(
        title="Confidence Evolution Over Time",
        xaxis_title="Time",
        yaxis_title="Confidence Score",
        yaxis_range=[0, 1],
        hovermode="x unified",
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
        height=400,
        template="plotly_white"
    )
    
    # Add reference lines
    fig.add_hline(y=0.6, line_dash="dash", line_color="gray", 
                  annotation_text="Trading Threshold")
    fig.add_hline(y=0.5, line_dash="dot", line_color="lightgray",
                  annotation_text="No Confidence")
    
    st.plotly_chart(fig, use_container_width=True)


def render_ab_comparison(ab: ABTesting):
    """Render A/B test comparison."""
    st.subheader("🧪 A/B Test Results")
    
    result = ab.compare_groups()
    balance = ab.get_balance_check()
    
    # Balance check
    if balance['is_balanced']:
        st.success(f"✅ Groups Balanced: {balance['control_pct']:.1f}% Control / {balance['treatment_pct']:.1f}% Treatment")
    else:
        st.warning(f"⚠️ Groups Unbalanced: {balance['control_pct']:.1f}% Control / {balance['treatment_pct']:.1f}% Treatment")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 🟦 Control Group")
        cm = result.control_metrics
        
        if cm.total_trades == 0:
            st.info("No trades yet")
        else:
            st.markdown(f"""
                - **Trades:** {cm.total_trades} ({cm.wins}W / {cm.losses}L)
                - **Win Rate:** {cm.win_rate:.1f}%
                - **Total P&L:** ${cm.total_pnl:+.2f}
                - **Avg P&L:** ${cm.avg_pnl:+.2f}
                - **Max Win:** ${cm.max_pnl:+.2f}
                - **Max Loss:** ${cm.min_pnl:+.2f}
                - **Avg Confidence:** {cm.avg_confidence:.1%}
                - **Sharpe:** {cm.sharpe_ratio:.2f}
            """)
    
    with col2:
        st.markdown("#### 🟩 Treatment Group")
        tm = result.treatment_metrics
        
        if tm.total_trades == 0:
            st.info("No trades yet")
        else:
            st.markdown(f"""
                - **Trades:** {tm.total_trades} ({tm.wins}W / {tm.losses}L)
                - **Win Rate:** {tm.win_rate:.1f}%
                - **Total P&L:** ${tm.total_pnl:+.2f}
                - **Avg P&L:** ${tm.avg_pnl:+.2f}
                - **Max Win:** ${tm.max_pnl:+.2f}
                - **Max Loss:** ${tm.min_pnl:+.2f}
                - **Avg Confidence:** {tm.avg_confidence:.1%}
                - **Sharpe:** {tm.sharpe_ratio:.2f}
            """)
    
    # Statistical comparison
    if result.control_metrics.total_trades >= 2 and result.treatment_metrics.total_trades >= 2:
        st.markdown("#### 📊 Statistical Comparison")
        
        col3, col4, col5 = st.columns(3)
        
        with col3:
            delta = result.lift_pct
            delta_color = "normal" if abs(delta) < 5 else ("inverse" if delta < 0 else "off")
            st.metric(
                label="Treat. Win Rate",
                value=f"{result.treatment_metrics.win_rate:.1f}%",
                delta=f"{delta:+.1f}%" if result.control_metrics.win_rate > 0 else None
            )
        
        with col4:
            st.metric(
                label="P-value",
                value=f"{result.p_value:.3f}"
            )
        
        with col5:
            sig_status = "✅ Significant" if result.is_significant else "❌ Not Significant"
            st.metric(
                label="Significance (α=0.05)",
                value=sig_status
            )
        
        # Recommendation box
        if result.is_significant and result.lift_pct > 0:
            st.success(f"**Recommendation:** {result.recommendation}")
        elif result.is_significant and result.lift_pct < 0:
            st.error(f"**Recommendation:** {result.recommendation}")
        else:
            st.info(f"**Recommendation:** {result.recommendation}")
    else:
        st.info("📊 Statistical comparison will appear when at least 2 trades are completed in each group.")


def render_ab_visualization(ab: ABTesting):
    """Render A/B test visualizations."""
    st.subheader("📊 Performance Visualization")
    
    # Get trade data
    control_trades = ab.db.get_trade_outcomes(group_assignment="control", limit=100)
    treatment_trades = ab.db.get_trade_outcomes(group_assignment="treatment", limit=100)
    
    if len(control_trades) == 0 and len(treatment_trades) == 0:
        st.info("No trade data yet. Charts will appear after trades are recorded.")
        return
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Win Rate Comparison")
        
        # Win rate bar chart
        control_metrics = ab.get_metrics("control")
        treatment_metrics = ab.get_metrics("treatment")
        
        categories = ['Control', 'Treatment']
        win_rates = [control_metrics.win_rate, treatment_metrics.win_rate]
        colors = ['#3B82F6', '#10B981']
        
        fig = go.Figure(data=[
            go.Bar(
                x=categories,
                y=win_rates,
                marker_color=colors,
                text=[f"{wr:.1f}%" for wr in win_rates],
                textposition='auto'
            )
        ])
        
        fig.update_layout(
            yaxis_title="Win Rate (%)",
            yaxis_range=[0, 100],
            height=300,
            template="plotly_white"
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("#### P&L Distribution")
        
        control_pnls = [t.pnl for t in control_trades if t.pnl is not None]
        treatment_pnls = [t.pnl for t in treatment_trades if t.pnl is not None]
        
        fig = go.Figure()
        
        if control_pnls:
            fig.add_trace(go.Box(
                y=control_pnls,
                name='Control',
                marker_color='#3B82F6'
            ))
        
        if treatment_pnls:
            fig.add_trace(go.Box(
                y=treatment_pnls,
                name='Treatment',
                marker_color='#10B981'
            ))
        
        fig.update_layout(
            yaxis_title="P&L ($)",
            showlegend=False,
            height=300,
            template="plotly_white"
        )
        
        st.plotly_chart(fig, use_container_width=True)


def render_trades_table(db: MLDatabase):
    """Render recent trades table."""
    st.subheader("📝 Recent Trades")
    
    trades = db.get_trade_outcomes(limit=20)
    
    if not trades:
        st.info("No trades recorded yet.")
        return
    
    df = pd.DataFrame([
        {
            "Trade ID": t.trade_id,
            "Type": t.suggestion_type.capitalize(),
            "Group": t.group_assignment.capitalize(),
            "Confidence": f"{t.confidence:.1%}",
            "Entry": f"{t.entry_price:.3f}",
            "Exit": f"{t.exit_price:.3f}" if t.exit_price else "-",
            "P&L": f"{t.pnl:+.2f}" if t.pnl else "-",
            "Outcome": "✅ Profit" if t.outcome else ("❌ Loss" if t.outcome is False else "⏳ Open"),
            "Time": t.created_at.strftime("%H:%M") if t.created_at else "-"
        }
        for t in trades
    ])
    
    st.dataframe(df, use_container_width=True, hide_index=True)


def render_strategy_performance(db: MLDatabase):
    """Render strategy performance by type."""
    st.subheader("🎯 Strategy Performance")
    
    metrics = db.get_suggestion_type_metrics()
    
    if not metrics:
        st.info("No strategy data yet. Performance will appear after trades are recorded.")
        return
    
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=('Win Rate by Strategy', 'Total P&L by Strategy'),
        specs=[[{"type": "bar"}, {"type": "bar"}]]
    )
    
    types = list(metrics.keys())
    colors = {'reversion': '#3B82F6', 'breakout': '#10B981', 'volatility': '#F59E0B'}
    
    # Win rates
    win_rates = [metrics[t]['win_rate'] for t in types]
    fig.add_trace(
        go.Bar(
            x=[t.capitalize() for t in types],
            y=win_rates,
            marker_color=[colors.get(t, '#666') for t in types],
            text=[f"{wr:.1f}%" for wr in win_rates],
            textposition='auto',
            name='Win Rate',
            showlegend=False
        ),
        row=1, col=1
    )
    
    # P&L
    pnls = [metrics[t]['total_pnl'] for t in types]
    fig.add_trace(
        go.Bar(
            x=[t.capitalize() for t in types],
            y=pnls,
            marker_color=[colors.get(t, '#666') for t in types],
            text=[f"${pnl:+.2f}" for pnl in pnls],
            textposition='auto',
            name='Total P&L',
            showlegend=False
        ),
        row=1, col=2
    )
    
    fig.update_layout(
        height=350,
        template="plotly_white"
    )
    
    fig.update_yaxes(title_text="Win Rate (%)", range=[0, 100], row=1, col=1)
    fig.update_yaxes(title_text="P&L ($)", row=1, col=2)
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Metrics table
    st.markdown("#### Detailed Metrics")
    
    df = pd.DataFrame([
        {
            "Strategy": stype.capitalize(),
            "Trades": m['total_trades'],
            "Win Rate": f"{m['win_rate']:.1f}%",
            "Wins": m['wins'],
            "Losses": m['losses'],
            "Total P&L": f"${m['total_pnl']:+.2f}",
            "Avg P&L": f"${m['avg_pnl']:+.2f}"
        }
        for stype, m in metrics.items()
    ])
    
    st.dataframe(df, use_container_width=True, hide_index=True)


def render_sidebar(ab: ABTesting, scorer: ConfidenceScorer):
    """Render sidebar controls."""
    st.sidebar.title("⚙️ ML Pipeline Controls")
    
    st.sidebar.markdown("---")
    
    # Auto-refresh
    st.sidebar.markdown("### 🔄 Auto-Refresh")
    auto_refresh = st.sidebar.checkbox("Enable auto-refresh", value=False)
    refresh_interval = st.sidebar.slider(
        "Refresh interval (seconds)",
        min_value=10, max_value=300, value=30, step=10,
        disabled=not auto_refresh
    )
    
    st.sidebar.markdown("---")
    
    # Action buttons
    st.sidebar.markdown("### 🎮 Actions")
    
    if st.sidebar.button("🧪 Simulate Test Trade"):
        import random
        
        # Create a simulated trade
        trade_id = f"sim_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Simulate for each group
        for group in ["control", "treatment"]:
            # Random suggestion type
            stype = random.choice(["reversion", "breakout", "volatility"])
            
            # Get current confidence
            conf = scorer.get_confidence(stype)
            
            # Simulate trade
            is_profit = random.random() < conf
            pnl = random.uniform(1, 10) if is_profit else random.uniform(-5, -1)
            
            # Record
            ab.record_trade_outcome(
                trade_id=f"{trade_id}_{group}",
                user_id="sim_user",
                group_assignment=group,
                suggestion_type=stype,
                confidence=conf,
                entry_price=random.uniform(0.3, 0.7)
            )
            
            # Complete
            ab.complete_trade(
                trade_id=f"{trade_id}_{group}",
                exit_price=random.uniform(0.3, 0.7),
                pnl=pnl
            )
            
            # Update confidence
            scorer.update_after_trade(stype, is_profit, pnl)
        
        st.sidebar.success("Simulated trades recorded!")
        st.rerun()
    
    st.sidebar.markdown("---")
    
    # Export options
    st.sidebar.markdown("### 💾 Export")
    if st.sidebar.button("Export A/B Results"):
        import json
        from io import StringIO
        
        result = ab.compare_groups()
        
        json_str = json.dumps(result.to_dict(), indent=2)
        st.sidebar.download_button(
            label="Download JSON",
            data=json_str,
            file_name=f"ab_results_{datetime.now().strftime('%Y%m%d')}.json",
            mime="application/json"
        )
    
    st.sidebar.markdown("---")
    
    # About
    st.sidebar.markdown("### 📋 About")
    st.sidebar.markdown(f"""
        **ML Pipeline Phase 2**
        - Bayesian confidence scoring
        - A/B testing framework
        - Real-time metrics
        
        [**Ticket: REMY-190**](#)
    """)
    
    return auto_refresh, refresh_interval


def main():
    """Main dashboard function."""
    init_session_state()
    
    db = st.session_state.db
    scorer = st.session_state.scorer
    ab = st.session_state.ab
    
    render_header()
    
    # Sidebar
    auto_refresh, refresh_interval = render_sidebar(ab, scorer)
    
    # Main content tabs
    tab1, tab2, tab3 = st.tabs([
        "📊 Confidence Scoring",
        "🧪 A/B Testing",
        "📝 Data & Settings"
    ])
    
    with tab1:
        render_confidence_scores(scorer)
        render_confidence_trends(db)
        render_strategy_performance(db)
    
    with tab2:
        render_ab_comparison(ab)
        render_ab_visualization(ab)
    
    with tab3:
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("#### Database Info")
            st.markdown(f"**Database Path:** `{db.db_path}`")
            
            # Count records
            all_trades = db.get_trade_outcomes(limit=9999)
            completed = [t for t in all_trades if t.outcome is not None]
            
            st.markdown(f"**Total Trades:** {len(all_trades)}")
            st.markdown(f"**Completed:** {len(completed)}")
            st.markdown(f"**Pending:** {len(all_trades) - len(completed)}")
        
        with col2:
            st.markdown("#### Confidence Parameters")
            for stype in ['reversion', 'breakout', 'volatility']:
                conf = scorer.get_confidence_detailed(stype)
                st.markdown(f"""
                    **{stype.capitalize()}**
                    - α={conf.alpha:.2f}, β={conf.beta:.2f}
                    - Variance: {conf.variance:.4f}
                """)
        
        st.markdown("---")
        
        render_trades_table(db)
    
    # Auto-refresh
    if auto_refresh:
        sleep(refresh_interval)
        st.rerun()


if __name__ == "__main__":
    main()
