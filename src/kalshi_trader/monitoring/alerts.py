"""Alert Management System.

Provides notification capabilities for critical events including:
- Circuit breaker triggers
- Model drift detection
- Daily/weekly P&L reports
- System health issues
"""

from __future__ import annotations

import json
import logging
import smtplib
from dataclasses import dataclass, field, asdict
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from enum import Enum, auto
from typing import Dict, List, Optional, Any, Callable
from urllib.request import Request, urlopen
from urllib.error import URLError

from ..ml.config import NotificationConfig, SlackConfig, EmailConfig
from ..ml.safety_controls import SafetyStatus, CircuitBreakerReason

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Alert:
    """Alert record."""
    alert_id: str
    title: str
    message: str
    severity: AlertSeverity
    category: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'alert_id': self.alert_id,
            'title': self.title,
            'message': self.message,
            'severity': self.severity.value,
            'category': self.category,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.metadata,
            'acknowledged': self.acknowledged,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'acknowledged_by': self.acknowledged_by,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Alert":
        """Create from dictionary."""
        return cls(
            alert_id=data['alert_id'],
            title=data['title'],
            message=data['message'],
            severity=AlertSeverity(data['severity']),
            category=data['category'],
            timestamp=datetime.fromisoformat(data['timestamp']),
            metadata=data.get('metadata', {}),
            acknowledged=data.get('acknowledged', False),
            acknowledged_at=datetime.fromisoformat(data['acknowledged_at']) if data.get('acknowledged_at') else None,
            acknowledged_by=data.get('acknowledged_by'),
        )


class AlertManager:
    """Manages alerts and notifications.
    
    Provides Slack and email notifications for critical events.
    
    Parameters
    ----------
    config : NotificationConfig | None
        Notification configuration
    alert_history_size : int
        Number of alerts to keep in memory
    
    Example
    -------
    >>> from kalshi_trader.monitoring import AlertManager
    >>> 
    >>> alerts = AlertManager()
    >>> alerts.send_circuit_breaker_alert(
    ...     reason="consecutive_losses",
    ...     daily_pnl=-55.0,
    ...     consecutive_losses=3,
    ... )
    """
    
    def __init__(
        self,
        config: Optional[NotificationConfig] = None,
        alert_history_size: int = 1000,
    ):
        self.config = config or NotificationConfig.from_env()
        self._alerts: List[Alert] = []
        self._alert_history_size = alert_history_size
        self._alert_callbacks: List[Callable[[Alert], None]] = []
    
    def send_circuit_breaker_alert(
        self,
        reason: CircuitBreakerReason,
        daily_pnl: float,
        consecutive_losses: int,
        reset_time: Optional[datetime] = None,
    ) -> Alert:
        """Send circuit breaker alert.
        
        Parameters
        ----------
        reason : CircuitBreakerReason
            Reason for circuit breaker
        daily_pnl : float
            Daily P&L at trigger
        consecutive_losses : int
            Number of consecutive losses
        reset_time : datetime | None
            When trading will resume
            
        Returns
        -------
        Alert
            Created alert
        """
        alert_id = f"cb_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        title = f"🚨 CIRCUIT BREAKER TRIGGERED: {reason.value}"
        message = (
            f"Trading halted due to {reason.value}.\n"
            f"Daily P&L: ${daily_pnl:+.2f}\n"
            f"Consecutive losses: {consecutive_losses}\n"
        )
        if reset_time:
            message += f"Trading resumes: {reset_time.strftime('%H:%M:%S')}"
        
        alert = Alert(
            alert_id=alert_id,
            title=title,
            message=message,
            severity=AlertSeverity.CRITICAL,
            category="circuit_breaker",
            metadata={
                'reason': reason.value,
                'daily_pnl': daily_pnl,
                'consecutive_losses': consecutive_losses,
                'reset_time': reset_time.isoformat() if reset_time else None,
            },
        )
        
        return self._send_alert(alert)
    
    def send_daily_pnl_report(
        self,
        daily_pnl: float,
        total_trades: int,
        win_rate: float,
        cumulative_pnl: float,
    ) -> Alert:
        """Send daily P&L report.
        
        Parameters
        ----------
        daily_pnl : float
            Daily profit/loss
        total_trades : int
            Number of trades today
        win_rate : float
            Win rate percentage
        cumulative_pnl : float
            Cumulative P&L
            
        Returns
        -------
        Alert
            Created alert
        """
        alert_id = f"pnl_{datetime.now().strftime('%Y%m%d')}"
        
        # Determine severity and emoji based on P&L
        if daily_pnl >= 0:
            emoji = "📈"
            severity = AlertSeverity.INFO
        elif daily_pnl >= -50:
            emoji = "📉"
            severity = AlertSeverity.WARNING
        else:
            emoji = "⚠️"
            severity = AlertSeverity.ERROR
        
        title = f"{emoji} Daily P&L Report - {datetime.now().strftime('%Y-%m-%d')}"
        message = (
            f"**Daily Summary**\n"
            f"P&L: ${daily_pnl:+.2f}\n"
            f"Trades: {total_trades}\n"
            f"Win Rate: {win_rate:.1f}%\n"
            f"Cumulative: ${cumulative_pnl:+.2f}"
        )
        
        alert = Alert(
            alert_id=alert_id,
            title=title,
            message=message,
            severity=severity,
            category="daily_report",
            metadata={
                'daily_pnl': daily_pnl,
                'total_trades': total_trades,
                'win_rate': win_rate,
                'cumulative_pnl': cumulative_pnl,
            },
        )
        
        return self._send_alert(alert)
    
    def send_model_drift_alert(
        self,
        model_version: str,
        drift_score: float,
        threshold: float,
        suggestion_type: str,
    ) -> Alert:
        """Send model drift detection alert.
        
        Parameters
        ----------
        model_version : str
            Model version showing drift
        drift_score : float
            Calculated drift score
        threshold : float
            Drift threshold that was exceeded
        suggestion_type : str
            Strategy type affected
            
        Returns
        -------
        Alert
            Created alert
        """
        alert_id = f"drift_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        title = f"⚠️ Model Drift Detected: {suggestion_type}"
        message = (
            f"Model {model_version} for {suggestion_type} shows drift.\n"
            f"Drift Score: {drift_score:.4f} (threshold: {threshold:.4f})\n"
            f"Recommendation: Consider retraining model."
        )
        
        alert = Alert(
            alert_id=alert_id,
            title=title,
            message=message,
            severity=AlertSeverity.WARNING,
            category="model_drift",
            metadata={
                'model_version': model_version,
                'drift_score': drift_score,
                'threshold': threshold,
                'suggestion_type': suggestion_type,
            },
        )
        
        return self._send_alert(alert)
    
    def send_health_alert(
        self,
        component: str,
        status: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Alert:
        """Send health check failure alert.
        
        Parameters
        ----------
        component : str
            Component name
        status : str
            Health status
        message : str
            Alert message
        details : dict | None
            Additional details
            
        Returns
        -------
        Alert
            Created alert
        """
        alert_id = f"health_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        severity = AlertSeverity.ERROR if status == "unhealthy" else AlertSeverity.WARNING
        
        title = f"🏥 Health Check: {component}"
        
        alert = Alert(
            alert_id=alert_id,
            title=title,
            message=message,
            severity=severity,
            category="health_check",
            metadata={
                'component': component,
                'status': status,
                'details': details or {},
            },
        )
        
        return self._send_alert(alert)
    
    def send_custom_alert(
        self,
        title: str,
        message: str,
        severity: AlertSeverity,
        category: str = "custom",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Alert:
        """Send custom alert.
        
        Parameters
        ----------
        title : str
            Alert title
        message : str
            Alert message
        severity : AlertSeverity
            Alert severity
        category : str
            Alert category
        metadata : dict | None
            Additional metadata
            
        Returns
        -------
        Alert
            Created alert
        """
        alert_id = f"custom_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        alert = Alert(
            alert_id=alert_id,
            title=title,
            message=message,
            severity=severity,
            category=category,
            metadata=metadata or {},
        )
        
        return self._send_alert(alert)
    
    def _send_alert(self, alert: Alert) -> Alert:
        """Send alert through all configured channels."""
        self._alerts.append(alert)
        self._trim_alerts()
        
        # Notify callbacks
        for callback in self._alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"Alert callback failed: {e}")
        
        # Send to Slack
        if self.config.slack.is_configured() and self._should_send_to_slack(alert):
            self._send_slack_notification(alert)
        
        # Send to Email
        if self.config.email.is_configured() and self._should_send_to_email(alert):
            self._send_email_notification(alert)
        
        logger.info(f"Alert sent: {alert.title} ({alert.severity.value})")
        return alert
    
    def _should_send_to_slack(self, alert: Alert) -> bool:
        """Check if alert should be sent to Slack."""
        category_config = {
            "circuit_breaker": self.config.circuit_breaker_alert,
            "model_drift": self.config.model_drift_alert,
            "daily_report": self.config.pnl_report,
            "health_check": True,
        }
        return category_config.get(alert.category, True)
    
    def _should_send_to_email(self, alert: Alert) -> bool:
        """Check if alert should be sent via email."""
        # Only send critical and error alerts via email
        return alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.ERROR]
    
    def _send_slack_notification(self, alert: Alert) -> None:
        """Send notification to Slack."""
        if not self.config.slack.webhook_url:
            return
        
        # Color based on severity
        colors = {
            AlertSeverity.INFO: "#36a64f",
            AlertSeverity.WARNING: "#ff9900",
            AlertSeverity.ERROR: "#ff0000",
            AlertSeverity.CRITICAL: "#990000",
        }
        
        payload = {
            "username": self.config.slack.username,
            "icon_emoji": self.config.slack.emoji,
            "attachments": [
                {
                    "color": colors.get(alert.severity, "#808080"),
                    "title": alert.title,
                    "text": alert.message,
                    "fields": [
                        {
                            "title": "Severity",
                            "value": alert.severity.value.upper(),
                            "short": True,
                        },
                        {
                            "title": "Category",
                            "value": alert.category,
                            "short": True,
                        },
                        {
                            "title": "Time",
                            "value": alert.timestamp.strftime("%H:%M:%S"),
                            "short": True,
                        },
                    ],
                    "footer": "Kalshi Trader ML",
                    "ts": int(alert.timestamp.timestamp()),
                }
            ],
        }
        
        try:
            req = Request(
                self.config.slack.webhook_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            
            with urlopen(req, timeout=self.config.slack.timeout_seconds) as resp:
                if resp.status == 200:
                    logger.debug("Slack notification sent successfully")
                else:
                    logger.warning(f"Slack notification failed: {resp.status}")
                    
        except URLError as e:
            logger.error(f"Failed to send Slack notification: {e}")
        except Exception as e:
            logger.error(f"Unexpected error sending Slack notification: {e}")
    
    def _send_email_notification(self, alert: Alert) -> None:
        """Send notification via email."""
        if not self.config.email.is_configured():
            return
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[Kalshi Trader] {alert.title}"
            msg['From'] = self.config.email.from_address
            msg['To'] = ', '.join(self.config.email.to_addresses)
            
            # Plain text body
            text_body = f"""
Alert: {alert.title}
Severity: {alert.severity.value.upper()}
Category: {alert.category}
Time: {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}

{alert.message}

---
Kalshi Trader ML Pipeline
"""
            
            # HTML body
            severity_colors = {
                AlertSeverity.INFO: "#36a64f",
                AlertSeverity.WARNING: "#ff9900",
                AlertSeverity.ERROR: "#ff0000",
                AlertSeverity.CRITICAL: "#990000",
            }
            color = severity_colors.get(alert.severity, "#808080")
            
            html_body = f"""
<html>
<body>
<h2 style="color: {color};">{alert.title}</h2>
<table>
<tr><td><strong>Severity:</strong></td><td>{alert.severity.value.upper()}</td></tr>
<tr><td><strong>Category:</strong></td><td>{alert.category}</td></tr>
<tr><td><strong>Time:</strong></td><td>{alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}</td></tr>
</table>
<hr>
<p>{alert.message.replace(chr(10), '<br>')}</p>
<hr>
<p><small>Kalshi Trader ML Pipeline</small></p>
</body>
</html>
"""
            
            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            with smtplib.SMTP(self.config.email.smtp_host, self.config.email.smtp_port) as server:
                server.starttls()
                server.login(self.config.email.smtp_user, self.config.email.smtp_password)
                server.send_message(msg)
            
            logger.debug("Email notification sent successfully")
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
    
    def acknowledge_alert(
        self,
        alert_id: str,
        acknowledged_by: str,
    ) -> Optional[Alert]:
        """Acknowledge an alert.
        
        Parameters
        ----------
        alert_id : str
            Alert ID to acknowledge
        acknowledged_by : str
            Person acknowledging
            
        Returns
        -------
        Alert | None
            Acknowledged alert or None if not found
        """
        for alert in self._alerts:
            if alert.alert_id == alert_id:
                alert.acknowledged = True
                alert.acknowledged_at = datetime.now()
                alert.acknowledged_by = acknowledged_by
                logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
                return alert
        return None
    
    def get_alerts(
        self,
        category: Optional[str] = None,
        severity: Optional[AlertSeverity] = None,
        acknowledged: Optional[bool] = None,
        limit: int = 100,
    ) -> List[Alert]:
        """Get filtered alerts.
        
        Parameters
        ----------
        category : str | None
            Filter by category
        severity : AlertSeverity | None
            Filter by severity
        acknowledged : bool | None
            Filter by acknowledged status
        limit : int
            Maximum number of alerts
            
        Returns
        -------
        List[Alert]
            Filtered alerts
        """
        filtered = self._alerts
        
        if category:
            filtered = [a for a in filtered if a.category == category]
        
        if severity:
            filtered = [a for a in filtered if a.severity == severity]
        
        if acknowledged is not None:
            filtered = [a for a in filtered if a.acknowledged == acknowledged]
        
        return sorted(filtered, key=lambda a: a.timestamp, reverse=True)[:limit]
    
    def get_unacknowledged_alerts(self) -> List[Alert]:
        """Get all unacknowledged alerts."""
        return [a for a in self._alerts if not a.acknowledged]
    
    def add_alert_callback(self, callback: Callable[[Alert], None]) -> None:
        """Add a callback for alert notifications.
        
        Parameters
        ----------
        callback : callable
            Function to call when alert is sent
        """
        self._alert_callbacks.append(callback)
    
    def _trim_alerts(self) -> None:
        """Trim alert history to max size."""
        if len(self._alerts) > self._alert_history_size:
            self._alerts = self._alerts[-self._alert_history_size:]
    
    def clear_alert_history(self) -> None:
        """Clear all alert history."""
        self._alerts.clear()
        logger.info("Alert history cleared")
