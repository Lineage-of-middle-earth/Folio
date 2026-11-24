import React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { FileSpreadsheet, FileText, FolderKanban, Moon, Sun, UserCheck } from 'lucide-react';
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
      <div className="flex min-h-screen flex-col bg-white text-[#191918] dark:bg-[#191918] dark:text-[#EDEDEC]">
        <header className="flex items-center justify-between gap-8 border-b border-neutral-200/80 px-6 py-4 dark:border-neutral-800 lg:px-10">
          <div className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0">
            Folio
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onToggleDark}
            className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label="Toggle theme"
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
        </header>

        <main className="mx-auto flex w-full max-w-[1060px] flex-1 flex-col justify-center px-6 py-12 lg:px-10">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col justify-center lg:col-span-6"
            >
              <h1 className="font-display text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-5xl [text-wrap:balance]">
                One quiet space for projects, notes, and habits.
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
                Sync directly with Google Workspace, or stay local in Guest Mode.
              </p>

              <div className="mt-8 flex w-full max-w-[260px] flex-col items-stretch gap-2.5">
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
                      {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
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
                  className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-[#F8F8F7] px-4 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                >
                  <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Continue as Guest</span>
                </motion.button>
              </div>

              {errorMessage && (
                <p className="mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {errorMessage}
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-[#F8F8F7] dark:border-neutral-800 dark:bg-[#20201E]">
                <div
                  className="h-56 w-full overflow-hidden border-b border-neutral-200/80 dark:border-neutral-800"
                  style={{ background: heroCover.fallbackGradient }}
                >
                  <img
                    src={heroCover.url}
                    alt="Minimalist architectural studio desk"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-3 divide-x divide-neutral-200/80 dark:divide-neutral-800">
                  <div className="flex flex-col items-start gap-1.5 p-4">
                    <FolderKanban className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      Drive Folders
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Projects & files
                    </span>
                  </div>
                  <div className="flex flex-col items-start gap-1.5 p-4">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      Sheets Tasks
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Board & table
                    </span>
                  </div>
                  <div className="flex flex-col items-start gap-1.5 p-4">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      Docs Pages
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Blocks & notes
                    </span>
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
