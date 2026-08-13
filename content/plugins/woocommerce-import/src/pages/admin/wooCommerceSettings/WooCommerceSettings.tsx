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
  type: 'products' | 'orders';
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

interface FailedRow {
  externalId: number;
  errorMessage: string | null;
}

interface Props {
  saveSettingApi: string;
  importProductsApi: string;
  importOrdersApi: string;
  setting: WooCommerceSetting;
  wooCommerceImportBatches: ImportBatch[];
}

// startedAt comes through GraphQL's String scalar from a JS Date (started_at is
// a timestamptz column), which serializes it as its epoch-ms valueOf() rather
// than a readable date - so it has to be re-parsed as a number here.
function formatDate(value: string): string {
  const date = /^\d+$/.test(value) ? new Date(Number(value)) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ImportAction({
  title,
  description,
  buttonLabel,
  importingLabel,
  importApi
}: {
  title: string;
  description: string;
  buttonLabel: string;
  importingLabel: string;
  importApi: string;
}) {
  const [isImporting, setIsImporting] = useState(false);

  const runImport = async () => {
    setIsImporting(true);
    try {
      const response = await axios.post(importApi, {}, { validateStatus: () => true });
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
    <Card.Session title={title}>
      <p>{description}</p>
      <button
        type="button"
        className="button primary"
        disabled={isImporting}
        onClick={() => runImport()}
      >
        {isImporting ? importingLabel : buttonLabel}
      </button>
    </Card.Session>
  );
}

function FailedCount({ batch }: { batch: ImportBatch }) {
  const modal = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [failures, setFailures] = useState<FailedRow[] | null>(null);

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
        <Modal modal={modal} title={batch.type === 'orders' ? 'Failed orders' : 'Failed products'}>
          {isLoading && <p>Loading…</p>}
          {!isLoading && failures?.length === 0 && <p>No failure details found for this batch.</p>}
          {!isLoading && failures && failures.length > 0 && (
            <table className="table table-auto w-full">
              <thead>
                <tr>
                  <th>{batch.type === 'orders' ? 'WooCommerce order ID' : 'WooCommerce product ID'}</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((failure) => (
                  <tr key={failure.externalId}>
                    <td>{failure.externalId}</td>
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
    const noun = batch.type === 'orders' ? 'orders' : 'products';
    if (!window.confirm(`Remove every ${noun.slice(0, -1)} this import run created?`)) {
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
      toast.success(`Batch ${noun} removed.`);
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
            <th>Type</th>
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
              <td>{formatDate(batch.startedAt)}</td>
              <td>{batch.type === 'orders' ? 'Orders' : 'Products'}</td>
              <td>{batch.status}</td>
              <td>{batch.totalCreated}</td>
              <td>{batch.totalUpdated}</td>
              <td>
                <FailedCount batch={batch} />
              </td>
              <td>
                {(batch.status === 'failed' || batch.status === 'partial') && (
                  <button
                    type="button"
                    className="text-critical"
                    disabled={rollingBackUuid === batch.uuid}
                    onClick={() => rollback(batch)}
                  >
                    Remove {batch.type === 'orders' ? 'orders' : 'products'} from this batch
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
  importOrdersApi,
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
              <ImportAction
                title="Import products"
                description="Fetch every product from the configured WooCommerce store and create or update it here."
                buttonLabel="Import products now"
                importingLabel="Importing…"
                importApi={importProductsApi}
              />
              <ImportAction
                title="Import orders"
                description="Fetch every order from the configured WooCommerce store and create or update it here. Import products first - order line items are linked to already-imported products."
                buttonLabel="Import orders now"
                importingLabel="Importing…"
                importApi={importOrdersApi}
              />
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
    importOrdersApi: url(routeId: "importOrders")
    setting {
      wooCommerceStoreUrl
      wooCommerceConsumerKey
    }
    wooCommerceImportBatches {
      uuid
      type
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
