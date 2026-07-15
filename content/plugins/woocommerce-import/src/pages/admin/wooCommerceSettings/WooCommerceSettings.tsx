import { Card } from '@components/admin/cms/Card';
import SettingMenu from '@components/admin/setting/SettingMenu';
import { Field } from '@components/form/Field';
import { Form } from '@components/form/Form';
import Modal from '@components/modal/Modal';
import { useModal } from '@components/modal/useModal';
import axios from 'axios';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface WooCommerceSetting {
  wooCommerceStoreUrl?: string;
  wooCommerceConsumerKey?: string;
}

interface ImportBatch {
  uuid: string;
  status: string;
  totalFetched: number;
  totalCreated: number;
  totalUpdated: number;
  totalFailed: number;
  errorMessage?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  rollbackApi: string;
  failuresApi: string;
}

interface FailedProduct {
  externalProductId: number;
  errorMessage: string | null;
}

interface Props {
  saveSettingApi: string;
  importProductsApi: string;
  setting: WooCommerceSetting;
  wooCommerceImportBatches: ImportBatch[];
}

function ImportAction({ importProductsApi }: { importProductsApi: string }) {
  const [isImporting, setIsImporting] = useState(false);

  const runImport = async () => {
    setIsImporting(true);
    try {
      const response = await axios.post(
        importProductsApi,
        {},
        { validateStatus: () => true }
      );
      if (response.status !== 200) {
        throw new Error(response.data?.error?.message ?? 'Import failed');
      }
      const batch = response.data.data;
      toast.success(
        `Import ${batch.status}: ${batch.total_created} created, ${batch.total_updated} updated, ${batch.total_failed} failed.`
      );
      window.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card.Session title="Import">
      <p>Fetch every product from the configured WooCommerce store and create or update it here.</p>
      <button
        type="button"
        className="button primary"
        disabled={isImporting}
        onClick={() => runImport()}
      >
        {isImporting ? 'Importing…' : 'Import products now'}
      </button>
    </Card.Session>
  );
}

function FailedCount({ batch }: { batch: ImportBatch }) {
  const modal = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [failures, setFailures] = useState<FailedProduct[] | null>(null);

  const showFailures = async () => {
    modal.openModal();
    if (failures !== null) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(batch.failuresApi, {
        validateStatus: () => true
      });
      if (response.status !== 200) {
        throw new Error(response.data?.error?.message ?? 'Could not load failures');
      }
      setFailures(response.data.data);
    } catch (e) {
      toast.error((e as Error).message);
      setFailures([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (batch.totalFailed === 0) {
    return <>{batch.totalFailed}</>;
  }

  return (
    <>
      <button type="button" className="text-critical underline" onClick={() => showFailures()}>
        {batch.totalFailed}
      </button>
      {modal.state.showing && (
        <Modal modal={modal} title="Failed products">
          {isLoading && <p>Loading…</p>}
          {!isLoading && failures?.length === 0 && <p>No failure details found for this batch.</p>}
          {!isLoading && failures && failures.length > 0 && (
            <table className="table table-auto w-full">
              <thead>
                <tr>
                  <th>WooCommerce product ID</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((failure) => (
                  <tr key={failure.externalProductId}>
                    <td>{failure.externalProductId}</td>
                    <td>{failure.errorMessage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </>
  );
}

function BatchHistory({ batches }: { batches: ImportBatch[] }) {
  const [rollingBackUuid, setRollingBackUuid] = useState<string | null>(null);

  const rollback = async (batch: ImportBatch) => {
    if (!window.confirm('Remove every product this import run created?')) {
      return;
    }
    setRollingBackUuid(batch.uuid);
    try {
      const response = await axios.delete(batch.rollbackApi, {
        validateStatus: () => true
      });
      if (response.status !== 200) {
        throw new Error(response.data?.error?.message ?? 'Rollback failed');
      }
      toast.success('Batch products removed.');
      window.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRollingBackUuid(null);
    }
  };

  if (batches.length === 0) {
    return (
      <Card.Session title="Import history">
        <p>No imports have been run yet.</p>
      </Card.Session>
    );
  }

  return (
    <Card.Session title="Import history">
      <table className="table table-auto w-full">
        <thead>
          <tr>
            <th>Started</th>
            <th>Status</th>
            <th>Created</th>
            <th>Updated</th>
            <th>Failed</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.uuid}>
              <td>{batch.startedAt}</td>
              <td>{batch.status}</td>
              <td>{batch.totalCreated}</td>
              <td>{batch.totalUpdated}</td>
              <td>
                <FailedCount batch={batch} /> (not working)
              </td>
              <td>
                {(batch.status === 'failed' || batch.status === 'partial') && (
                  <button
                    type="button"
                    className="text-critical"
                    disabled={rollingBackUuid === batch.uuid}
                    onClick={() => rollback(batch)}
                  >
                    Remove products from this batch
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card.Session>
  );
}

export default function WooCommerceSettings({
  saveSettingApi,
  importProductsApi,
  setting: { wooCommerceStoreUrl, wooCommerceConsumerKey },
  wooCommerceImportBatches
}: Props) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-8 grid-flow-row">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            method="POST"
            id="wooCommerceSettings"
            action={saveSettingApi}
            onSuccess={(response: any) => {
              if (!response.error) {
                toast.success('Setting saved');
              } else {
                toast.error(response.error.message);
              }
            }}
          >
            <Card>
              <Card.Session title="WooCommerce connection">
                <Field
                  name="wooCommerceStoreUrl"
                  label="Store URL"
                  placeholder="https://your-store.com"
                  value={wooCommerceStoreUrl}
                  type="text"
                />
                <Field
                  name="wooCommerceConsumerKey"
                  label="Consumer Key"
                  value={wooCommerceConsumerKey}
                  type="text"
                />
                <Field
                  name="wooCommerceConsumerSecret"
                  label="Consumer Secret"
                  instruction="Leave blank to keep the currently saved secret."
                  value=""
                  type="password"
                />
              </Card.Session>
            </Card>
          </Form>
          <div className="mt-8">
            <Card>
              <ImportAction importProductsApi={importProductsApi} />
              <BatchHistory batches={wooCommerceImportBatches ?? []} />
            </Card>
          </div>
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
    saveSettingApi: url(routeId: "saveSetting")
    importProductsApi: url(routeId: "importProducts")
    setting {
      wooCommerceStoreUrl
      wooCommerceConsumerKey
    }
    wooCommerceImportBatches {
      uuid
      status
      totalFetched
      totalCreated
      totalUpdated
      totalFailed
      errorMessage
      startedAt
      finishedAt
      rollbackApi
      failuresApi
    }
  }
`;
