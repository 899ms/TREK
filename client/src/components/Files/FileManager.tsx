import { useFileManager, type FileManagerProps } from './useFileManager'
import { ImageLightbox } from './FileManagerImageLightbox'
import { AssignModal } from './FileManagerAssignModal'
import { PdfPreviewModal } from './FileManagerPdfPreviewModal'
import { MarkdownPreviewModal } from './FileManagerMarkdownPreviewModal'
import { isMarkdown } from './FileManager.helpers'
import { FileManagerToolbar } from './FileManagerToolbar'
import { TrashView } from './FileManagerTrashView'
import { FilesView } from './FileManagerFilesView'
import DocSyncPanel from './docsync/DocSyncPanel'

export default function FileManager(props: FileManagerProps) {
  const S = useFileManager(props)
  const { lightboxIndex, setLightboxIndex, mediaFiles, assignFileId, previewFile, handlePaste, showTrash } = S
  return (
    <div className="relative flex flex-col h-full" style={{ fontFamily: "var(--font-system)" }} onPaste={handlePaste} tabIndex={-1}>
      {/* Lightbox */}
      {lightboxIndex !== null && <ImageLightbox files={mediaFiles} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}

      {/* Assign modal */}
      {assignFileId && <AssignModal {...S} />}

      {/* Document preview modal (markdown is rendered inline; everything else PDF/object) */}
      {previewFile && (isMarkdown(previewFile.mime_type, previewFile.original_name)
        ? <MarkdownPreviewModal {...S} />
        : <PdfPreviewModal {...S} />)}

      {/* Document sync, as an overlay rather than a route: it is configuration
          for the documents on this screen, and sending someone to settings to
          reach it loses the context that makes the folder choice obvious. */}
      {S.showDocSync && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-surface p-4">
          <DocSyncPanel tripId={props.tripId} isOwner={S.isTripOwner} onClose={() => S.setShowDocSync(false)} />
        </div>
      )}

      {/* Toolbar */}
      <FileManagerToolbar {...S} />

      {showTrash ? <TrashView {...S} /> : <FilesView {...S} />}

      <style>{`
        @media (max-width: 767px) {
          .file-actions button { padding: 8px !important; }
          .file-actions svg { width: 18px !important; height: 18px !important; }
        }
      `}</style>
    </div>
  )
}
