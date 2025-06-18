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

const validArtworkFileNames = [
  "Album Artwork Small",
  "Single Artwork Small",
  "Album Artwork Large",
  "Single Artwork Large",
  "Spotify Header",
];

export const validateArtworkFileName = (fileName: string) => {
  const fileNameWithoutExtension = fileName.split(".")[0];
  if (!validArtworkFileNames.includes(fileNameWithoutExtension)) {
    return `Invalid file name. Must be one of: ${validArtworkFileNames.join(
      ", "
    )}`;
  }
  return null;
};
