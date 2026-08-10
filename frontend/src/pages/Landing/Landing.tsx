import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/common/Button';
import { 
  Activity, 
  AlertCircle, 
  Clock, 
  Zap, 
  MessageSquare, 
  Bell, 
  Download, 
  Cpu, 
  Radio, 
  LayoutDashboard, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import styles from './Landing.module.css';
import logo from '../../assets/scrum master logo.png';

export const Landing: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const workflowSteps = [
    {
      number: '01',
      title: 'Connect',
      subtitle: 'Download the integration package',
      desc: 'Get a zero-dependency integration bundle generated dynamically for your workspace.',
      icon: Download
    },
    {
      number: '02',
      title: 'Integrate',
      subtitle: 'Let Antigravity integrate',
      desc: 'Instruct Antigravity to attach the agent to your existing backend without breaking logic.',
      icon: Cpu
    },
    {
      number: '03',
      title: 'Detect',
      subtitle: 'First secure heartbeat',
      desc: 'Scrum Master receives the encrypted handshake and automatically provisions your workspace.',
      icon: Radio
    },
    {
      number: '04',
      title: 'Monitor',
      subtitle: 'Live in your dashboard',
      desc: 'Your project appears instantly with real-time uptime, health checks, error logs, and feedback.',
      icon: LayoutDashboard
    }
  ];

  const features = [
    {
      icon: Clock,
      title: 'Uptime Monitoring',
      desc: 'Periodic automated pings for frontend & backend services with latency tracking.'
    },
    {
      icon: AlertCircle,
      title: 'Error Tracking',
      desc: 'Real-time error capture, grouping by severity, stack trace inspection, and root-cause analysis.'
    },
    {
      icon: Zap,
      title: 'Performance Monitoring',
      desc: 'Response time distributions, SLA tracking, and bottleneck identification.'
    },
    {
      icon: Activity,
      title: 'API Monitoring',
      desc: 'Endpoint health verification, status code checks, and payload validation.'
    },
    {
      icon: MessageSquare,
      title: 'User Feedback',
      desc: 'In-app feedback collection hub linked directly to engineering incidents.'
    },
    {
      icon: Bell,
      title: 'Instant Notifications',
      desc: 'Multi-channel alerts when metrics breach thresholds or critical incidents trigger.'
    }
  ];

  return (
    <div className={styles.container}>
      {/* Navigation Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logoGroup} onClick={() => navigate('/')}>
            <img src={logo} alt="Scrum Master Logo" className={styles.logo} />
            <span className={styles.brandTitle}>SCRUM MASTER</span>
          </div>

          <nav className={styles.navActions}>
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button size="sm" onClick={() => navigate('/signup')}>
              Get Started Free
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroBadge}>
          <ShieldCheck size={14} />
          <span>Centralized Monitoring Platform</span>
        </div>

        <h1 className={styles.heroTitle}>
          Connect your application.<br />
          Understand what is happening.<br />
          <span className={styles.heroHighlight}>Act before users report it.</span>
        </h1>

        <p className={styles.heroSubtitle}>
          Scrum Master delivers unified uptime monitoring, error tracking, API health checks, and user feedback for your existing applications — setup in under 2 minutes.
        </p>

        <div className={styles.heroCtaGroup}>
          <Button size="lg" onClick={() => navigate('/signup')} className={styles.primaryCta}>
            Get Started Free <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/login')}>
            Login
          </Button>
        </div>
      </section>

      {/* Product Workflow Section */}
      <section className={styles.workflowSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How Scrum Master Works</h2>
          <p className={styles.sectionSubtitle}>
            Zero manual setup. Connect your existing codebase in 4 simple steps.
          </p>
        </div>

        <div className={styles.workflowGrid}>
          {workflowSteps.map((step) => (
            <div key={step.number} className={styles.workflowCard}>
              <div className={styles.stepNumberBar}>
                <span className={styles.stepNumber}>{step.number}</span>
                <step.icon size={20} className={styles.stepIcon} />
              </div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <div className={styles.stepSubtitle}>{step.subtitle}</div>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid Section */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Built for Engineers & Operations</h2>
          <p className={styles.sectionSubtitle}>
            Everything you need to monitor, debug, and maintain high-availability web applications.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((feat, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <feat.icon size={22} />
              </div>
              <h3 className={styles.featureTitle}>{feat.title}</h3>
              <p className={styles.featureDesc}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaInner}>
          <h2>Ready to monitor your application?</h2>
          <p>Get started today with single-command integration and zero boilerplate code.</p>
          <Button size="lg" onClick={() => navigate('/signup')}>
            Get Started Free <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <img src={logo} alt="Scrum Master Logo" className={styles.footerLogo} />
            <span>SCRUM MASTER</span>
          </div>
          <div className={styles.footerCopy}>
            &copy; {new Date().getFullYear()} Scrum Master Monitoring Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
