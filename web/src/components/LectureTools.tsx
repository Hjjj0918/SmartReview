import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { FileUp, MessageSquare, Paperclip, Send } from 'lucide-react';
import type { ImportTextResult } from '../types';
import { importLectureText } from '../api/library';
import { readApiErrorMessage } from '../api/request';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface LectureExtractResponse {
  filename: string;
  page_count: number;
  char_count: number;
  text: string;
  detected_course?: string | null;
}

const MAX_CONTEXT_CHARS = 120000;
const DEFAULT_GENERATE_COUNT = 20;

interface LectureToolsProps {
  onLibraryChanged: () => void;
}

export default function LectureTools({
  onLibraryChanged,
}: LectureToolsProps) {
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [lecture, setLecture] = useState<LectureExtractResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Upload a PDF to generate MCQs, or just chat. You can also attach PPT slide images.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const lectureSummary = useMemo(() => {
    if (!lecture) return null;
    return `${lecture.filename} · ${lecture.page_count} pages · ${lecture.char_count.toLocaleString()} chars`;
  }, [lecture]);

  const openPdfPicker = useCallback(() => {
    pdfInputRef.current?.click();
  }, []);

  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const generateAndImportMcq = useCallback(
    async (extracted: LectureExtractResponse) => {
      setGenerateError(null);
      setImportStatus(null);

      const text = (extracted.text || '').trim();
      if (!text) {
        setGenerateError('No text extracted from PDF. Try a text-based PDF or OCR it first.');
        return;
      }

      setIsGenerating(true);
      try {
        const result = (await importLectureText({
          fileContent: text.slice(0, MAX_CONTEXT_CHARS),
          questionCount: DEFAULT_GENERATE_COUNT,
        })) as ImportTextResult;

        onLibraryChanged();
        setImportStatus(
          `Imported ${result.course_name} / ${result.chapter_title} (+${result.added_question_count} questions)`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'MCQ generation failed';
        setGenerateError(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [onLibraryChanged]
  );

  const handlePdfSelected = useCallback(
    async (file: File) => {
      setUploadError(null);
      setGenerateError(null);
      setImportStatus(null);
      setIsUploading(true);

      let extracted: LectureExtractResponse | null = null;
      try {
        const form = new FormData();
        form.append('file', file, file.name);

        const resp = await fetch('/api/lecture/extract', {
          method: 'POST',
          body: form,
        });

        if (!resp.ok) {
          const message = await readApiErrorMessage(resp);
          throw new Error(message);
        }

        extracted = (await resp.json()) as LectureExtractResponse;
        setLecture(extracted);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploadError(message);
      } finally {
        setIsUploading(false);
      }

      if (extracted) {
        await generateAndImportMcq(extracted);
      }
    },
    [generateAndImportMcq]
  );

  const handlePdfInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      await handlePdfSelected(file);
    },
    [handlePdfSelected]
  );

  const handleImageInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = '';
      if (files.length === 0) return;
      setAttachedImages(files);
    },
    []
  );

  const sendChat = useCallback(async () => {
    const question = draft.trim();
    if (!question || isSending) return;

    setChatError(null);
    setIsSending(true);

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setDraft('');

    try {
      const payload = {
        messages: nextMessages,
        contextText: (lecture?.text ?? '').slice(0, MAX_CONTEXT_CHARS),
      };

      const form = new FormData();
      form.append('payload', JSON.stringify(payload));
      for (const img of attachedImages) {
        form.append('images', img, img.name);
      }

      const resp = await fetch('/api/chat', {
        method: 'POST',
        body: form,
      });

      if (!resp.ok) {
        const message = await readApiErrorMessage(resp);
        throw new Error(message);
      }

      const data = (await resp.json()) as { reply: string };
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      setAttachedImages([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat failed';
      setChatError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry — I could not reach the AI server. Check backend logs and DEEPSEEK_API_KEY (and GEMINI_API_KEY for images).',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [attachedImages, draft, isSending, lecture?.text, messages]);

  const handleChatSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await sendChat();
    },
    [sendChat]
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Lecture notes
          </p>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={openPdfPicker}
            disabled={isUploading || isGenerating}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FileUp size={14} />
            {isUploading ? 'Uploading…' : isGenerating ? 'Generating…' : 'Upload PDF'}
          </motion.button>
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handlePdfInputChange}
          />
        </div>

        {lectureSummary ? (
          <p className="text-xs text-slate-600 truncate" title={lectureSummary}>
            {lectureSummary}
          </p>
        ) : (
          <p className="text-xs text-slate-500">No PDF uploaded</p>
        )}

        {isGenerating && (
          <p className="mt-1 text-xs text-slate-500">Generating MCQs…</p>
        )}

        {importStatus && (
          <p className="mt-1 text-xs text-emerald-700 break-words">{importStatus}</p>
        )}

        {uploadError && (
          <p className="mt-1 text-xs text-rose-600 break-words">{uploadError}</p>
        )}

        {generateError && (
          <p className="mt-1 text-xs text-rose-600 break-words">{generateError}</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={14} className="text-slate-400" />
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            AI chat (DeepSeek)
          </p>
        </div>

        <div className="h-40 overflow-y-auto pr-1 space-y-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={`max-w-[85%] text-xs leading-relaxed px-3 py-2 rounded-lg whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-indigo-50 text-slate-800 border border-indigo-100'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        {attachedImages.length > 0 && (
          <p className="mt-2 text-[11px] text-slate-400">
            Attached: {attachedImages.length} image(s)
          </p>
        )}

        {chatError && (
          <p className="mt-2 text-xs text-rose-600 break-words">{chatError}</p>
        )}

        <form className="mt-2 flex items-center gap-2" onSubmit={handleChatSubmit}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={openImagePicker}
            disabled={isSending}
            className="shrink-0 w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            aria-label="Attach images"
          >
            <Paperclip size={16} />
          </motion.button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageInputChange}
          />

          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question…"
            className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />

          <motion.button
            type="submit"
            whileHover={draft.trim() ? { scale: 1.01 } : {}}
            whileTap={draft.trim() ? { scale: 0.99 } : {}}
            disabled={isSending || !draft.trim()}
            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              draft.trim()
                ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            aria-label="Send"
          >
            <Send size={16} />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
