import React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { FileSpreadsheet, FileText, FolderKanban, HardDrive, Moon, Sun, UserCheck } from 'lucide-react';
import { COVER_PRESETS } from '../lib/coverAssets';

interface AuthScreenProps {
  onSignIn: () => void;
  onGuestSignIn: () => void;
  isSigningIn: boolean;
  errorMessage: string | null;
  darkMode: boolean;
  onToggleDark: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSignIn,
  onGuestSignIn,
  isSigningIn,
  errorMessage,
  darkMode,
  onToggleDark,
}) => {
  const heroCover = COVER_PRESETS[0];

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-white text-[#191918] dark:bg-[#191918] dark:text-[#EDEDEC] flex flex-col">
      <header className="flex items-center justify-between gap-8 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800 lg:px-10">
        <div className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0">
          Folio
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <a href="#workspace-sync" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0">
            Workspace Sync
          </a>
          <a href="#sheets-db" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0">
            Sheets Database
          </a>
          <a href="#docs-pages" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0">
            Docs Pages
          </a>
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onGuestSignIn}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
          >
            <HardDrive className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Guest Mode (Local)</span>
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onToggleDark}
            className="rounded-lg border border-neutral-200 p-2 text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label="Toggle color theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={darkMode ? 'sun' : 'moon'}
                initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                transition={{ duration: 0.14 }}
                className="block"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1160px] flex-1 flex-col justify-center px-6 py-12 lg:px-10">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center lg:col-span-6"
          >
            <p className="text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
              Google Drive · Google Sheets · Google Docs · Local Guest Mode
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-5xl [text-wrap:balance]">
              Your Notion-style workspace, synced to Google or saved locally.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
              Write project briefs with slash-command blocks, run Kanban boards and daily habits, and either synchronize directly with Google Drive or work offline in Guest Mode with local storage.
            </p>

            <div className="mt-8 flex flex-col items-start gap-3">
              <div className="flex w-full max-w-[260px] flex-col items-stretch gap-2.5">
                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  onClick={onSignIn}
                  disabled={isSigningIn}
                  className="gsi-material-button w-full"
                >
                  <div className="gsi-material-button-state" />
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        style={{ display: 'block' }}
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isSigningIn ? 'Connecting Google Workspace...' : 'Sign in with Google'}
                    </span>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  onClick={onGuestSignIn}
                  disabled={isSigningIn}
                  className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-[#F8F8F7] px-4 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-100 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                >
                  <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Continue as Guest (Save Locally)</span>
                </motion.button>
              </div>

              {errorMessage && (
                <p className="max-w-md rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {errorMessage}
                </p>
              )}

              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                In Guest Mode, all projects, documents, daily tasks, and files are stored locally in your browser without requiring Google sign-in.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-[#F8F8F7] dark:border-neutral-800 dark:bg-[#20201E]">
              <div
                className="relative h-48 w-full overflow-hidden border-b border-neutral-200 dark:border-neutral-800"
                style={{ background: heroCover.fallbackGradient }}
              >
                <img
                  src={heroCover.url}
                  alt="Minimalist architectural studio desk"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>Workspace Architecture</span>
                    <span aria-hidden="true">·</span>
                    <span>Bi-Directional Sync</span>
                  </div>
                  <h2 className="mt-2 font-display text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    One project folder, three synchronized surfaces
                  </h2>
                </div>

                <div className="mt-6 divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  <div id="workspace-sync" className="flex items-start gap-3 py-3.5">
                    <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-300" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Google Drive Project Folders
                      </p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Organize every initiative inside your Folio Workspace folder, upload assets, and link existing Drive files.
                      </p>
                    </div>
                  </div>
                  <div id="sheets-db" className="flex items-start gap-3 py-3.5">
                    <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Google Sheets Task Databases
                      </p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Switch between Kanban boards, tables, and lists while syncing rows directly with Google Sheets.
                      </p>
                    </div>
                  </div>
                  <div id="docs-pages" className="flex items-start gap-3 py-3.5">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        Google Docs Block Pages
                      </p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Draft structured specs with slash commands, checklists, and headings synced straight to Google Docs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
    </MotionConfig>
  );
};
