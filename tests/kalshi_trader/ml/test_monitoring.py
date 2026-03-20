"""Tests for Monitoring and Alerting."""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta

from kalshi_trader.monitoring.alerts import (
    AlertManager,
    Alert,
    AlertSeverity,
)
from kalshi_trader.monitoring.metrics import (
    MetricsCollector,
    PerformanceMetrics,
    StrategyMetrics,
)
from kalshi_trader.monitoring.health import (
    HealthChecker,
    HealthCheck,
    HealthStatus,
)
from kalshi_trader.monitoring.reporter import (
    PnLReporter,
    PnLReport,
    ReportSchedule,
)


class TestAlert:
    """Test Alert dataclass."""
    
    def test_creation(self):
        """Test alert creation."""
        alert = Alert(
            alert_id="test_001",
            title="Test Alert",
            message="Test message",
            severity=AlertSeverity.WARNING,
            category="test",
        )
        
        assert alert.alert_id == "test_001"
        assert alert.severity == AlertSeverity.WARNING
        assert alert.acknowledged is False
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        alert = Alert(
            alert_id="test_002",
            title="Test",
            message="Test",
            severity=AlertSeverity.ERROR,
            category="circuit_breaker",
        )
        
        data = alert.to_dict()
        
        assert data['alert_id'] == "test_002"
        assert data['severity'] == "error"


class TestAlertManager:
    """Test AlertManager class."""
    
    @pytest.fixture
    def mock_config(self):
        """Create mock config."""
        config = MagicMock()
        config.slack.is_configured.return_value = False
        config.email.is_configured.return_value = False
        config.circuit_breaker_alert = True
        config.daily_loss_alert = True
        config.model_drift_alert = True
        return config
    
    def test_circuit_breaker_alert(self, mock_config):
        """Test circuit breaker alert creation."""
        from kalshi_trader.ml.safety_controls import CircuitBreakerReason
        
        manager = AlertManager(config=mock_config)
        
        alert = manager.send_circuit_breaker_alert(
            reason=CircuitBreakerReason.CONSECUTIVE_LOSSES,
            daily_pnl=-75.0,
            consecutive_losses=3,
        )
        
        assert alert.severity == AlertSeverity.CRITICAL
        assert alert.category == "circuit_breaker"
        assert "CIRCUIT BREAKER" in alert.title
    
    def test_daily_pnl_report_profitable(self, mock_config):
        """Test daily PnL report for profitable day."""
        manager = AlertManager(config=mock_config)
        
        alert = manager.send_daily_pnl_report(
            daily_pnl=150.0,
            total_trades=10,
            win_rate=0.7,
            cumulative_pnl=500.0,
        )
        
        assert alert.severity == AlertSeverity.INFO
        assert "📈" in alert.title
    
    def test_daily_pnl_report_unprofitable(self, mock_config):
        """Test daily PnL report for unprofitable day."""
        manager = AlertManager(config=mock_config)
        
        alert = manager.send_daily_pnl_report(
            daily_pnl=-60.0,
            total_trades=10,
            win_rate=0.3,
            cumulative_pnl=440.0,
        )
        
        assert alert.severity == AlertSeverity.ERROR
    
    def test_model_drift_alert(self, mock_config):
        """Test model drift alert."""
        manager = AlertManager(config=mock_config)
        
        alert = manager.send_model_drift_alert(
            model_version="v1.0",
            drift_score=0.07,
            threshold=0.05,
            suggestion_type="breakout",
        )
        
        assert alert.severity == AlertSeverity.WARNING
        assert alert.category == "model_drift"
        assert "v1.0" in alert.message
    
    def test_acknowledge_alert(self, mock_config):
        """Test alert acknowledgment."""
        manager = AlertManager(config=mock_config)
        
        # Send an alert
        alert = manager.send_custom_alert(
            title="Test",
            message="Test",
            severity=AlertSeverity.INFO,
        )
        
        # Acknowledge it
        acknowledged = manager.acknowledge_alert(alert.alert_id, "test_user")
        
        assert acknowledged is not None
        assert acknowledged.acknowledged is True
        assert acknowledged.acknowledged_by == "test_user"
    
    def test_get_alerts_filtering(self, mock_config):
        """Test alert filtering."""
        manager = AlertManager(config=mock_config)
        
        # Create alerts
        manager.send_custom_alert("Test1", "Test", AlertSeverity.INFO, "test")
        manager.send_custom_alert("Test2", "Test", AlertSeverity.ERROR, "error")
        manager.send_custom_alert("Test3", "Test", AlertSeverity.WARNING, "test")
        
        # Filter by severity
        errors = manager.get_alerts(severity=AlertSeverity.ERROR)
        assert len(errors) == 1
        
        # Filter by category
        test_alerts = manager.get_alerts(category="test")
        assert len(test_alerts) == 2


class TestMetricsCollector:
    """Test MetricsCollector class."""
    
    def test_trade_recording(self):
        """Test trade recording."""
        collector = MetricsCollector(retention_window=100)
        
        collector.record_trade(
            trade_id="trade_001",
            suggestion_type="breakout",
            pnl=10.0,
            confidence=0.75,
            position_size=100.0,
            entry_price=0.45,
            exit_price=0.55,
        )
        
        metrics = collector.get_current_metrics()
        assert metrics.total_trades == 1
        assert metrics.total_pnl == 10.0
    
    def test_win_rate_calculation(self):
        """Test win rate calculation."""
        collector = MetricsCollector()
        
        # Record winning trades
        for i in range(7):
            collector.record_trade(
                trade_id=f"win_{i}",
                suggestion_type="breakout",
                pnl=10.0,
                confidence=0.7,
                position_size=100.0,
                entry_price=0.5,
                exit_price=0.6,
            )
        
        # Record losing trades
        for i in range(3):
            collector.record_trade(
                trade_id=f"loss_{i}",
                suggestion_type="breakout",
                pnl=-5.0,
                confidence=0.6,
                position_size=100.0,
                entry_price=0.5,
                exit_price=0.4,
            )
        
        win_rate = collector.get_win_rate()
        assert abs(win_rate - 0.7) < 0.01  # Should be 7/10 = 0.7
    
    def test_circuit_breaker_counting(self):
        """Test circuit breaker counting."""
        collector = MetricsCollector()
        
        collector.record_circuit_breaker()
        collector.record_circuit_breaker()
        
        metrics = collector.get_current_metrics()
        assert metrics.circuit_breakers_triggered == 2
    
    def test_fallback_tracking(self):
        """Test ML fallback tracking."""
        collector = MetricsCollector()
        
        collector.record_ml_prediction(latency_ms=50.0)
        collector.record_ml_prediction(latency_ms=60.0)
        collector.record_ml_fallback("Model unavailable")
        
        metrics = collector.get_current_metrics()
        assert metrics.ml_predictions_made == 2
        assert metrics.fallback_to_momentum == 1


class TestHealthChecker:
    """Test HealthChecker class."""
    
    def test_register_and_run_check(self):
        """Test health check registration and execution."""
        checker = HealthChecker()
        
        # Register a check
        def check_component():
            return HealthCheck(
                component="test",
                status=HealthStatus.HEALTHY,
                message="All good",
            )
        
        checker.register_check("test_component", check_component)
        
        # Run the check
        result = checker.run_check("test_component")
        
        assert result is not None
        assert result.status == HealthStatus.HEALTHY
    
    def test_run_all_checks(self):
        """Test running all registered checks."""
        checker = HealthChecker()
        
        # Register multiple checks
        checker.register_check(
            "db",
            lambda: HealthCheck("db", HealthStatus.HEALTHY, "OK"),
        )
        checker.register_check(
            "api",
            lambda: HealthCheck("api", HealthStatus.HEALTHY, "OK"),
        )
        
        report = checker.run_checks()
        
        assert report.status == HealthStatus.HEALTHY
        assert len(report.checks) == 2
    
    def test_unhealthy_component_detection(self):
        """Test detection of unhealthy component."""
        checker = HealthChecker()
        
        checker.register_check(
            "healthy",
            lambda: HealthCheck("healthy", HealthStatus.HEALTHY, "OK"),
        )
        checker.register_check(
            "unhealthy",
            lambda: HealthCheck("unhealthy", HealthStatus.UNHEALTHY, "Failed"),
        )
        
        report = checker.run_checks()
        
        assert report.status == HealthStatus.UNHEALTHY
    
    def test_degraded_detection(self):
        """Test detection of degraded state."""
        checker = HealthChecker()
        
        checker.register_check(
            "db",
            lambda: HealthCheck("db", HealthStatus.DEGRADED, "Slow"),
        )
        checker.register_check(
            "api",
            lambda: HealthCheck("api", HealthStatus.HEALTHY, "OK"),
        )
        
        report = checker.run_checks()
        
        assert report.status == HealthStatus.DEGRADED
    
    def test_is_healthy(self):
        """Test is_healthy method."""
        checker = HealthChecker()
        
        checker.register_check(
            "component",
            lambda: HealthCheck("component", HealthStatus.HEALTHY, "OK"),
        )
        
        checker.run_checks()
        
        assert checker.is_healthy() is True
        assert checker.is_healthy("component") is True
    
    def test_get_unhealthy_components(self):
        """Test getting unhealthy components."""
        checker = HealthChecker()
        
        checker.register_check(
            "healthy",
            lambda: HealthCheck("healthy", HealthStatus.HEALTHY, "OK"),
        )
        checker.register_check(
            "unhealthy",
            lambda: HealthCheck("unhealthy", HealthStatus.UNHEALTHY, "Failed"),
        )
        
        checker.run_checks()
        
        unhealthy = checker.get_unhealthy_components()
        assert "unhealthy" in unhealthy
        assert "healthy" not in unhealthy


class TestPnLReporter:
    """Test PnLReporter class."""
    
    @pytest.fixture
    def mock_db(self):
        """Create mock database."""
        return MagicMock()
    
    def test_schedule_addition(self, mock_db):
        """Test adding report schedule."""
        reporter = PnLReporter(mock_db)
        
        reporter.add_schedule(ReportSchedule.DAILY, time="17:00")
        
        assert ReportSchedule.DAILY in reporter._schedules
        schedule = reporter._schedules[ReportSchedule.DAILY]
        assert schedule['enabled'] is True
    
    def test_report_generation_daily(self, mock_db):
        """Test daily report generation."""
        reporter = PnLReporter(mock_db)
        
        report = reporter.generate_daily_report()
        
        assert report.report_type == ReportSchedule.DAILY
        assert report.report_id.startswith("DAILY_")
    
    def test_report_generation_weekly(self, mock_db):
        """Test weekly report generation."""
        reporter = PnLReporter(mock_db)
        
        report = reporter.generate_weekly_report()
        
        assert report.report_type == ReportSchedule.WEEKLY
        assert report.report_id.startswith("WEEKLY_")
    
    def test_insights_generation(self, mock_db):
        """Test insights generation."""
        reporter = PnLReporter(mock_db)
        
        # Create metrics with data
        metrics = PerformanceMetrics(total_trades=10, total_pnl=100.0)
        metrics.total_win_rate = 0.6
        
        insights = reporter._generate_insights(metrics, ReportSchedule.DAILY)
        
        assert len(insights) > 0
        assert any("Profitable" in i for i in insights)


class TestIntegration:
    """Integration tests for monitoring components."""
    
    def test_metric_to_alert_flow(self):
        """Test flow from metrics to alerts."""
        # Create components
        metrics = MetricsCollector()
        
        # Record bad trades to trigger circuit breaker scenario
        for i in range(10):
            metrics.record_trade(
                trade_id=f"loss_{i}",
                suggestion_type="breakout",
                pnl=-10.0,
                confidence=0.5,
                position_size=100.0,
                entry_price=0.5,
                exit_price=0.4,
            )
        
        # Check that metrics reflect the losses
        current = metrics.get_current_metrics()
        assert current.total_pnl == -100.0
    
    def test_health_cascades(self):
        """Test that health checks cascade properly."""
        checker = HealthChecker()
        
        # Multiple components, some affected
        checker.register_check(
            "db",
            lambda: HealthCheck("db", HealthStatus.UNHEALTHY, "Connection failed"),
        )
        checker.register_check(
            "cache",
            lambda: HealthCheck("cache", HealthStatus.UNHEALTHY, "Unreachable"),
        )
        
        report = checker.run_checks()
        
        assert report.status == HealthStatus.UNHEALTHY
        assert len(report.checks) == 2
