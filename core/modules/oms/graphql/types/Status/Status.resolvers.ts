import { getConfig } from '../../../../../lib/util/getConfig.js';

interface Status {
  name?: string;
  badge?: string;
  progress?: string;
  [key: string]: unknown;
}

type StatusList = Record<string, Status>;

const mapStatusList = (statusList: StatusList) =>
  Object.keys(statusList).map((key) => ({
    ...statusList[key],
    code: key
  }));

export default {
  Query: {
    statusList: () => {
      const statusList = getConfig(
        'oms.order.status',
        {}
      ) as StatusList;

      return mapStatusList(statusList);
    },

    shipmentStatusList: () => {
      const statusList = getConfig(
        'oms.order.shipmentStatus',
        {}
      ) as StatusList;

      return mapStatusList(statusList);
    },

    paymentStatusList: () => {
      const statusList = getConfig(
        'oms.order.paymentStatus',
        {}
      ) as StatusList;

      return mapStatusList(statusList);
    }
  }
};