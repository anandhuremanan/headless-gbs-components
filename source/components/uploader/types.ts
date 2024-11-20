export type FileUploadProps = {
  showImagePreview?: boolean;
  multiple?: boolean;
  onChange?: (files: FileList | null) => void;
  selectedFiles?: File[];
  accept?: string;
  fileCount?: number;
  disabled?: boolean;
  inputFileSize?: number;
  startUpload?: boolean;
  apiURL?: string;
  chunk_size?: number;
  uploadedFileIdArray?: (ids: string[]) => void;
  fileData?: File[];
  documentId?: string[];
  isRemovable?: boolean;
  removedIds?: (fileId: string | null) => void;
};

export type UploadedFilePreview = {
  files?: any[];
  UploadedFileData: any[];
  apiURL: string;
  previewType?: boolean;
  showImagePreview: boolean;
  previewUrls: { [key: string]: string };
  onFileRemove: any;
  isRemovable: boolean;
  removedId?: any;
};
