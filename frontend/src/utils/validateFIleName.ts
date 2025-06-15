export const validateAudioFileName = (fileName: string, isMaster: boolean) => {
  const masterPattern =
    /^\d{1,2} - [^-]+ - [^-]+ \[Master\]\.(wav|flac|aiff)$/i;
  const premasterPattern =
    /^\d{1,2} - [^-]+ - [^-]+ \[Premaster\]\.(wav|flac|aiff)$/i;
  const isValid = isMaster
    ? masterPattern.test(fileName)
    : premasterPattern.test(fileName);
  if (!isValid) {
    return `Invalid file name. Must be in the format '01 - Artist Name - Track Name ${
      isMaster ? "[Master]" : "[Premaster]"
    }.wav'`;
  }
  return null;
};
