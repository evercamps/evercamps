import Badge from '@components/Badge';
import { Card } from '@components/admin/cms/Card';
import SettingMenu from '@components/admin/setting/SettingMenu';
import axios from 'axios';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface Plugin {
  name: string;
  source: string;
  priority: number | null;
  declaredEnabled: boolean;
  effectiveEnabled: boolean;
  runningEnabled: boolean;
  restartRequired: boolean;
  toggleable: boolean;
}

interface Props {
  pluginStatusApi: string;
  plugins: Plugin[];
}

function ToggleAction({
  plugin,
  pluginStatusApi
}: {
  plugin: Plugin;
  pluginStatusApi: string;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const toggle = async () => {
    setIsSaving(true);
    try {
      const response = await axios.post(
        pluginStatusApi,
        { name: plugin.name, enabled: !plugin.effectiveEnabled },
        { validateStatus: () => true }
      );
      if (response.status !== 200) {
        throw new Error(
          response.data?.error?.message ?? 'Could not update plugin status'
        );
      }
      toast.success(
        `${plugin.name} ${
          response.data.data.enabled ? 'enabled' : 'disabled'
        }. Restart the app to apply the change.`
      );
      window.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!plugin.toggleable) {
    return (
      <span className="text-secondary" title="Core modules can't be disabled">
        —
      </span>
    );
  }

  return (
    <button
      type="button"
      className="button"
      disabled={isSaving}
      onClick={() => toggle()}
    >
      {plugin.effectiveEnabled ? 'Disable' : 'Enable'}
    </button>
  );
}

export default function PluginManagement({ pluginStatusApi, plugins }: Props) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-8 grid-flow-row">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Card>
            <Card.Session title="Plugins">
              <p>
                Disabling a plugin does not delete any data it has stored. A
                plugin that depends on another disabled plugin may fail to
                start.
              </p>
              <table className="table table-auto w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Running</th>
                    <th />
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {plugins.map((plugin) => (
                    <tr key={plugin.name}>
                      <td>{plugin.name}</td>
                      <td>{plugin.source}</td>
                      <td>
                        <Badge
                          title={plugin.effectiveEnabled ? 'Enabled' : 'Disabled'}
                          variant={plugin.effectiveEnabled ? 'success' : 'default'}
                          progress="complete"
                        />
                      </td>
                      <td>{plugin.runningEnabled ? 'Running' : 'Not running'}</td>
                      <td>
                        {plugin.restartRequired && (
                          <Badge
                            title="Restart required"
                            variant="warning"
                            progress="complete"
                          />
                        )}
                      </td>
                      <td>
                        <ToggleAction
                          plugin={plugin}
                          pluginStatusApi={pluginStatusApi}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card.Session>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    pluginStatusApi: url(routeId: "updatePluginStatus")
    plugins {
      name
      source
      priority
      declaredEnabled
      effectiveEnabled
      runningEnabled
      restartRequired
      toggleable
    }
  }
`;
