import { addProcessor } from '@evercamps/evercamps/lib/util/registry';
import { isValidNationalNumber, isTruthyFlag } from './lib/nationalNumber.js';

interface ParticipantData {
  national_number?: string;
  national_number_not_applicable?: boolean | number | string;
  [key: string]: any;
}

function validateNationalNumber(data: ParticipantData): ParticipantData {
  if (isTruthyFlag(data.national_number_not_applicable)) {
    return data;
  }
  if (!isValidNationalNumber(data.national_number)) {
    throw new Error(
      'National number is invalid. Check the number, or tick "Not applicable" for non-Belgian participants.'
    );
  }
  return data;
}

export default async (): Promise<void> => {
  addProcessor('participantDataBeforeCreate', validateNationalNumber, 20);
  addProcessor('participantDataBeforeUpdate', validateNationalNumber, 20);
};
