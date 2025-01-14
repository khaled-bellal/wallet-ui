import axios from "axios";
import { z } from "zod";

import { HERMEZ_WEB_URL } from "src/constants";
import { StrictSchema } from "src/utils/type-safety";

const baseApiUrl = HERMEZ_WEB_URL;

interface WalletUnderMaintenanceResponse {
  isWalletUnderMaintenance: number;
}

const walletUnderMaintenanceResponseParser = StrictSchema<WalletUnderMaintenanceResponse>()(
  z.object({
    isWalletUnderMaintenance: z.number(),
  })
);

/**
 * Fetches the status of the Hermez network
 */
function getNetworkStatus(): Promise<number> {
  return axios.get(`${baseApiUrl}/network-status.json`).then((res) => {
    const parsedResponse = walletUnderMaintenanceResponseParser.safeParse(res.data);
    if (parsedResponse.success) {
      return parsedResponse.data.isWalletUnderMaintenance;
    } else {
      return Promise.reject(parsedResponse.error.message);
    }
  });
}

export { getNetworkStatus };
