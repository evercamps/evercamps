// This plugin drives product creation/update itself (see lib/runImport.ts)
// rather than intercepting core's own create/update flow, so it has no
// addProcessor/hookBefore registrations to make at startup.
export default async (): Promise<void> => {};
