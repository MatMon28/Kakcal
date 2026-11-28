import React, { useEffect, useState } from 'react';
import { Activity, ChevronRight, Download, RefreshCw, Shield } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  getHealthConnectStatus,
  isAndroidApp,
  openHealthConnectSettings,
  requestHealthConnectPermissions,
  type HealthConnectStatus,
} from '../../../utils/android';
import { ActionRow, SubSection, TONE, ToggleRow } from './SettingsParts';

export const HealthConnectSettings: React.FC = () => {
  const {
    t,
    language,
    settings,
    updateSettings,
    syncHealthConnect,
    isHealthConnectSyncing,
    healthConnectSyncMessage,
  } = useApp();
  const [hcStatus, setHcStatus] = useState<HealthConnectStatus | null>(null);

  useEffect(() => {
    if (!isAndroidApp()) return;
    let active = true;
    void getHealthConnectStatus().then((res) => {
      if (active) setHcStatus(res);
    });
    return () => { active = false; };
  }, []);

  if (!isAndroidApp()) return null;

  const hc = t.settings.healthConnect;
  const formattedLastSync = settings.healthConnectLastSyncedAt
    ? (() => {
        const d = new Date(settings.healthConnectLastSyncedAt);
        if (Number.isNaN(d.getTime())) return hc.neverSynced;
        return hc.lastSynced.replace(
          '{time}',
          d.toLocaleString(language === 'it' ? 'it-IT' : 'en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        );
      })()
    : hc.neverSynced;

  const handleConnect = async () => {
    const granted = await requestHealthConnectPermissions();
    const latest = await getHealthConnectStatus();
    setHcStatus(latest);
    if (granted || latest.granted) {
      updateSettings({ healthConnectSyncEnabled: true });
      await syncHealthConnect({ manual: true });
    }
  };

  return (
    <SubSection title={hc.title} hint={hc.hint}>
      {!hcStatus || hcStatus.status === 'unsupported' ? (
        <ActionRow
          icon={<Activity size={14} />}
          tone={TONE.slate}
          title={hc.title}
          description={hc.unsupported}
          disabled
          onClick={() => undefined}
        />
      ) : hcStatus.status === 'needs_install' ? (
        <ActionRow
          icon={<Download size={14} />}
          tone={TONE.red}
          title={hc.installBtn}
          description={hc.needsInstall}
          onClick={() => void openHealthConnectSettings()}
          trailing={<ChevronRight size={15} className="text-[var(--muted)] shrink-0" />}
        />
      ) : !hcStatus.granted ? (
        <ActionRow
          icon={<Activity size={14} />}
          tone={TONE.red}
          title={hc.connectBtn}
          description={hc.connectDesc}
          onClick={() => void handleConnect()}
          trailing={<ChevronRight size={15} className="text-[var(--muted)] shrink-0" />}
        />
      ) : (
        <>
          <ToggleRow
            icon={<Activity size={14} />}
            tone={TONE.red}
            title={hc.autoSync}
            description={hc.autoSyncDesc}
            on={Boolean(settings.healthConnectSyncEnabled)}
            onToggle={() => updateSettings({ healthConnectSyncEnabled: !settings.healthConnectSyncEnabled })}
          />
          <ActionRow
            icon={<RefreshCw size={14} className={isHealthConnectSyncing ? 'animate-spin' : ''} />}
            tone={TONE.teal}
            title={isHealthConnectSyncing ? hc.syncing : hc.syncNow}
            description={healthConnectSyncMessage ? `${formattedLastSync} · ${healthConnectSyncMessage}` : formattedLastSync}
            disabled={isHealthConnectSyncing}
            onClick={() => void syncHealthConnect({ manual: true })}
          />
          <ActionRow
            icon={<Shield size={14} />}
            tone={TONE.slate}
            title={hc.managePermissions}
            description={hc.managePermissionsDesc}
            onClick={() => void openHealthConnectSettings()}
            trailing={<ChevronRight size={15} className="text-[var(--muted)] shrink-0" />}
          />
        </>
      )}
    </SubSection>
  );
};
