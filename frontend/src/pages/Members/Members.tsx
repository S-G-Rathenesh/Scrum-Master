import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../stores/projectStore';
import { membersService, type Member } from '../../services/members';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ProjectRequiredEmptyState } from '../../components/common/ProjectRequiredEmptyState';
import { Users, UserPlus, ShieldAlert, CheckCircle2, Trash2, Clock, ChevronDown, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import styles from './Members.module.css';

const ROLE_OPTIONS = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'VIEWER', label: 'Viewer' }
];

export const Members: React.FC = () => {
  const { currentProject } = useProjectStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('MEMBER');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Dropdown Popover & Portal State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 0 });

  const updateMenuPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 180; // height for 4 option items
    
    if (spaceBelow < menuHeight && rect.top > spaceBelow) {
      setMenuPos({
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width
      });
    } else {
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (dropdownOpen) {
      updateMenuPosition();
      const handleScrollOrResize = () => updateMenuPosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [dropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        portalMenuRef.current && !portalMenuRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadMembers = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const data = await membersService.getMembers(currentProject.id);
      setMembers(data);
    } catch (err: any) {
      console.error('Failed to load members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentProject) {
      loadMembers();
    }
  }, [currentProject]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;

    setEmailError('');
    setSuccessMsg('');
    setErrorMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError('Email address is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      await membersService.addMember(currentProject.id, trimmedEmail, accessLevel);
      setSuccessMsg(`✓ Access granted successfully to ${trimmedEmail}`);
      setEmail('');
      setAccessLevel('MEMBER');
      await loadMembers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to grant access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeMember = async (memberId: string, memberEmail: string) => {
    if (!currentProject) return;
    try {
      await membersService.revokeMember(currentProject.id, memberId);
      await loadMembers();
    } catch (err) {
      console.error(`Failed to revoke member ${memberEmail}:`, err);
    }
  };

  if (!currentProject) {
    return <ProjectRequiredEmptyState message="Select a project to view project members." />;
  }

  const selectedRoleObj = ROLE_OPTIONS.find(r => r.value === accessLevel) || ROLE_OPTIONS[0];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users style={{ color: 'var(--color-primary)' }} /> MEMBERS &amp; ACCESS CONTROL
          </h1>
          <p className={styles.subtitle}>
            Manage users and special feature access for {currentProject.name}
          </p>
        </div>
      </header>

      {/* INFORMATIONAL CARD: NO SUBSCRIPTION / PREMIUM SYSTEM */}
      <Card>
        <CardContent>
          <div className={styles.noSubBox}>
            <ShieldAlert size={24} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
            <div>
              <h4 className={styles.noSubTitle}>NO SUBSCRIPTION / PREMIUM SYSTEM</h4>
              <p className={styles.noSubText}>
                This project does not have an active paid subscription or tier-based billing system configured.
                The application is currently completely free. You can grant role-based team access below.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ADD MEMBER FORM */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={18} style={{ color: 'var(--color-primary)' }} /> ADD MEMBER / GRANT ACCESS
          </CardTitle>
        </CardHeader>
        <CardContent style={{ overflow: 'visible' }}>
          <form onSubmit={handleAddMember} className={styles.form} noValidate>
            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>User Email</label>
                <input
                  type="email"
                  className={styles.select}
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Access Level</label>
                <div className={styles.dropdownWrapper}>
                  <button
                    ref={triggerRef}
                    type="button"
                    className={`${styles.dropdownTrigger} ${dropdownOpen ? styles.dropdownTriggerActive : ''}`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    disabled={isSubmitting}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="listbox"
                  >
                    <span>{selectedRoleObj.label}</span>
                    <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none', color: 'var(--color-primary)' }} />
                  </button>
                </div>
              </div>
            </div>

            {emailError && <span className={styles.errorMsg}>{emailError}</span>}

            {successMsg && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--color-success)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} /> {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className={styles.errorMsg} style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)' }}>
                {errorMsg}
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: 'var(--color-primary)',
                  color: '#080A0F',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {isSubmitting ? 'GRANTING ACCESS...' : 'GRANT ACCESS'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* PORTAL DROPDOWN POPOVER MENU (RENDERED DIRECTLY AT DOCUMENT BODY, HIGHEST Z-INDEX) */}
      {dropdownOpen && createPortal(
        <div
          ref={portalMenuRef}
          className={styles.portalMenu}
          role="listbox"
          style={{
            position: 'fixed',
            left: `${menuPos.left}px`,
            width: `${menuPos.width}px`,
            ...(menuPos.top !== undefined ? { top: `${menuPos.top}px` } : {}),
            ...(menuPos.bottom !== undefined ? { bottom: `${menuPos.bottom}px` } : {}),
            zIndex: 999999
          }}
        >
          {ROLE_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={accessLevel === opt.value}
              className={`${styles.dropdownOption} ${accessLevel === opt.value ? styles.dropdownOptionSelected : ''}`}
              onClick={() => {
                setAccessLevel(opt.value);
                setDropdownOpen(false);
              }}
            >
              <span>{opt.label}</span>
              {accessLevel === opt.value && <Check size={14} style={{ color: 'var(--color-primary)' }} />}
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* MEMBERS TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>MEMBERS WITH ACCESS ({members.length})</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {isLoading && members.length === 0 ? (
            <div className={styles.emptyState}>Loading project members...</div>
          ) : members.length === 0 ? (
            <div className={styles.emptyState}>
              <Users size={40} style={{ opacity: 0.4 }} />
              <p>No extra members have been added to this project yet.</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User Email</th>
                    <th>Access Level</th>
                    <th>Status</th>
                    <th>Granted Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className={styles.row}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {m.email}
                      </td>
                      <td>
                        <Badge variant={m.accessLevel === 'OWNER' ? 'success' : 'default'}>
                          {m.accessLevel}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant="success">{m.status}</Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                          <Clock size={14} />
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {m.accessLevel !== 'OWNER' && (
                          <Button
                            variant="outline"
                            onClick={() => handleRevokeMember(m.id, m.email)}
                            style={{ padding: '0.25rem 0.6rem', color: 'var(--color-error)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                          >
                            <Trash2 size={13} style={{ marginRight: '0.25rem' }} /> Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
