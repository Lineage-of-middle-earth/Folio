import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  FolderMinus,
  FolderOpen,
  FolderPlus,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  clearAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './lib/googleAuth';
import {
  AuthExpiredError,
  buildStandaloneDocStarterBlocks,
  buildTaskDocStarterBlocks,
  createFullWorkspaceProject,
  createStandaloneProjectDocument,
  createStandaloneWorkspacePage,
  createTaskDocument,
  discoverStandaloneWorkspacePages,
  discoverWorkspaceProjects,
  fetchDocBlocks,
  fetchSheetTasks,
  findOrCreateRootFolder,
  listFolderFiles,
  permanentlyDeleteDriveFile,
  renameDriveFile,
  syncBlocksToDoc,
  syncTasksToSheet,
  trashDriveFile,
  uid,
  uploadFileToDriveFolder,
} from './lib/googleWorkspaceApi';
import {
  createLocalStandalonePage,
  createLocalWorkspaceProject,
  exportGuestWorkspaceToFile,
  GUEST_USER_ID,
  isGuestModeStored,
  loadGuestWorkspace,
  saveGuestProjects,
  saveGuestStandalonePages,
  setGuestModeStored,
} from './lib/guestWorkspace';
import { COVER_PRESETS, getCoverPresetByIndex } from './lib/coverAssets';
import {
  DocBlock,
  DriveFileItem,
  PendingConfirmation,
  ProjectDocPage,
  ProjectFolderGroup,
  ProjectTabView,
  ProjectWorkspace,
  StandalonePage,
  SyncActivityEntry,
  TaskItem,
  WorkspaceArea,
} from './types/workspace';
import { AuthScreen } from './components/AuthScreen';
import { NotionSidebar, SidebarUserProfile } from './components/NotionSidebar';
import { ProjectView } from './components/ProjectView';
import { FolderGalleryView } from './components/FolderGalleryView';
import { StandalonePageView } from './components/StandalonePageView';
import { SyncHubView } from './components/SyncHubView';
import { DriveBrowserView } from './components/DriveBrowserView';
import { CommandPalette } from './components/CommandPalette';
import { ConfirmModal } from './components/ConfirmModal';
import { DailyPlannerView } from './components/DailyPlannerView';
import { LinkWorkspaceModal } from './components/LinkWorkspaceModal';
import { NewProjectModal } from './components/NewProjectModal';

const GUEST_USER_PROFILE: SidebarUserProfile = {
  uid: GUEST_USER_ID,
  displayName: 'Guest Workspace',
  email: 'Saved locally in browser',
  photoURL: null,
};

export default function App() {
  const [user, setUser] = useState<User | SidebarUserProfile | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullWidthCanvas, setFullWidthCanvas] = useState<boolean>(() => {
    try {
      return localStorage.getItem('folio_canvas_full_width') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleFullWidth = useCallback(() => {
    setFullWidthCanvas((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('folio_canvas_full_width', String(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  }, []);

  const [rootFolder, setRootFolder] = useState<{
    id: string;
    name: string;
    webViewLink: string;
  } | null>(null);
  const [projects, setProjects] = useState<ProjectWorkspace[]>([]);
  const [folderGroups, setFolderGroups] = useState<ProjectFolderGroup[]>([]);
  const [standalonePages, setStandalonePages] = useState<StandalonePage[]>([]);
  const [removedItemIds, setRemovedItemIds] = useState<Record<string, boolean>>({});
  const [projectGroupMap, setProjectGroupMap] = useState<Record<string, string>>({});
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const [activeArea, setActiveArea] = useState<WorkspaceArea>('overview');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeStandalonePageId, setActiveStandalonePageId] = useState<string | null>(null);
  const [pendingProjectGroupId, setPendingProjectGroupId] = useState<string | null>(null);
  const [openOverviewMenuId, setOpenOverviewMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTabView>('page');
  const [isPullingId, setIsPullingId] = useState<string | null>(null);

  const [commandOpen, setCommandOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [linkModalState, setLinkModalState] = useState<{
    open: boolean;
    mode: 'import-project' | 'link-to-project' | 'link-to-task' | 'link-extra-doc';
    targetTaskId?: string;
    targetTaskTitle?: string;
  }>({ open: false, mode: 'import-project' });

  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [activityLog, setActivityLog] = useState<SyncActivityEntry[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Record<string, boolean>>({});
  const [loadingTaskDocIds, setLoadingTaskDocIds] = useState<Record<string, boolean>>({});
  const [syncingTaskDocIds, setSyncingTaskDocIds] = useState<Record<string, boolean>>({});
  const [loadingExtraDocIds, setLoadingExtraDocIds] = useState<Record<string, boolean>>({});
  const [syncingExtraDocIds, setSyncingExtraDocIds] = useState<Record<string, boolean>>({});
  const [pullingStandaloneIds, setPullingStandaloneIds] = useState<Record<string, boolean>>({});
  const [syncingStandaloneIds, setSyncingStandaloneIds] = useState<Record<string, boolean>>({});
  const [selectedExtraDocId, setSelectedExtraDocId] = useState<string | null>(null);
  const [requestedTaskId, setRequestedTaskId] = useState<string | null>(null);
  const projectsRef = useRef<ProjectWorkspace[]>([]);
  const syncingRef = useRef<Record<string, boolean>>({});

  const hasProjectDirty = useCallback(
    (p: ProjectWorkspace) =>
      p.dirtyDoc ||
      p.dirtyTasks ||
      p.tasks.some((t) => Boolean(t.dirtyTaskDoc)) ||
      p.extraDocs.some((d) => Boolean(d.dirty)),
    []
  );

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  const logActivity = useCallback(
    (
      projectTitle: string,
      target: SyncActivityEntry['target'],
      action: string
    ) => {
      setActivityLog((prev) => [
        {
          id: uid('log'),
          timestamp: new Date().toISOString(),
          projectTitle,
          target,
          action,
        },
        ...prev,
      ]);
    },
    []
  );

  const handleApiError = useCallback((err: unknown) => {
    if (err instanceof AuthExpiredError) {
      clearAccessToken();
      setToken(null);
      setNeedsAuth(true);
      setAuthError('Your Google Workspace session expired. Please sign in again.');
      return;
    }
    const msg = err instanceof Error ? err.message : 'Workspace request failed.';
    setWorkspaceError(msg);
  }, []);

  // Load and persist folder groups, project group assignments, and removed item IDs per user
  useEffect(() => {
    if (!user?.uid) return;
    try {
      const rawGroups = localStorage.getItem(`folio_folder_groups_v1_${user.uid}`);
      if (rawGroups) setFolderGroups(JSON.parse(rawGroups));
      const rawMap = localStorage.getItem(`folio_project_group_map_v1_${user.uid}`);
      if (rawMap) setProjectGroupMap(JSON.parse(rawMap));
      const rawRemoved = localStorage.getItem(`folio_removed_items_v1_${user.uid}`);
      if (rawRemoved) setRemovedItemIds(JSON.parse(rawRemoved));
    } catch {
      // ignore parse errors
    }
  }, [user?.uid]);

  const saveFolderGroups = useCallback(
    (nextGroups: ProjectFolderGroup[]) => {
      setFolderGroups(nextGroups);
      if (user?.uid) {
        try {
          localStorage.setItem(
            `folio_folder_groups_v1_${user.uid}`,
            JSON.stringify(nextGroups)
          );
        } catch {
          // ignore
        }
      }
    },
    [user?.uid]
  );

  const saveProjectGroupMap = useCallback(
    (nextMap: Record<string, string>) => {
      setProjectGroupMap(nextMap);
      if (user?.uid) {
        try {
          localStorage.setItem(
            `folio_project_group_map_v1_${user.uid}`,
            JSON.stringify(nextMap)
          );
        } catch {
          // ignore
        }
      }
    },
    [user?.uid]
  );

  const saveRemovedItemIds = useCallback(
    (nextRemoved: Record<string, boolean>) => {
      setRemovedItemIds(nextRemoved);
      if (user?.uid) {
        try {
          localStorage.setItem(
            `folio_removed_items_v1_${user.uid}`,
            JSON.stringify(nextRemoved)
          );
        } catch {
          // ignore
        }
      }
    },
    [user?.uid]
  );

  const bootstrapWorkspace = useCallback(
    async (accessToken: string, uidForStorage?: string) => {
      setIsLoadingWorkspace(true);
      setWorkspaceError(null);
      try {
        let savedGroupMap: Record<string, string> = {};
        let savedRemoved: Record<string, boolean> = {};
        if (uidForStorage) {
          try {
            const rawMap = localStorage.getItem(
              `folio_project_group_map_v1_${uidForStorage}`
            );
            if (rawMap) savedGroupMap = JSON.parse(rawMap);
            const rawRemoved = localStorage.getItem(
              `folio_removed_items_v1_${uidForStorage}`
            );
            if (rawRemoved) savedRemoved = JSON.parse(rawRemoved);
          } catch {
            // ignore
          }
        }

        const root = await findOrCreateRootFolder(accessToken);
        setRootFolder(root);
        const [discoveredProjects, discoveredPages] = await Promise.all([
          discoverWorkspaceProjects(accessToken, root.id),
          discoverStandaloneWorkspacePages(accessToken, root.id),
        ]);

        const visibleProjects = discoveredProjects
          .filter((p) => !savedRemoved[p.id])
          .map((p) => ({
            ...p,
            groupId: savedGroupMap[p.id] || p.groupId || null,
          }));

        const visiblePages = discoveredPages.filter((pg) => !savedRemoved[pg.id]);

        setProjects(visibleProjects);
        setStandalonePages(visiblePages);
        if (visibleProjects.length > 0) {
          setActiveProjectId((curr) => curr || visibleProjects[0].id);
        }
      } catch (err) {
        handleApiError(err);
      } finally {
        setIsLoadingWorkspace(false);
      }
    },
    [handleApiError]
  );

  const bootstrapGuestWorkspace = useCallback(() => {
    let savedGroupMap: Record<string, string> = {};
    let savedRemoved: Record<string, boolean> = {};
    try {
      const rawMap = localStorage.getItem(
        `folio_project_group_map_v1_${GUEST_USER_ID}`
      );
      if (rawMap) savedGroupMap = JSON.parse(rawMap);
      const rawRemoved = localStorage.getItem(
        `folio_removed_items_v1_${GUEST_USER_ID}`
      );
      if (rawRemoved) savedRemoved = JSON.parse(rawRemoved);
    } catch {
      // ignore
    }

    const loaded = loadGuestWorkspace(savedGroupMap, savedRemoved);
    setProjects(loaded.projects);
    setStandalonePages(loaded.standalonePages);
    setRootFolder(null);
    if (loaded.projects.length > 0) {
      setActiveProjectId((curr) => curr || loaded.projects[0].id);
    }
  }, []);

  // Automatically persist projects & standalone pages in Guest Mode whenever they change
  useEffect(() => {
    if (!isGuestMode || needsAuth) return;
    saveGuestProjects(projects);
  }, [isGuestMode, needsAuth, projects]);

  useEffect(() => {
    if (!isGuestMode || needsAuth) return;
    saveGuestStandalonePages(standalonePages);
  }, [isGuestMode, needsAuth, standalonePages]);

  useEffect(() => {
    const unsub = initAuth(
      (authUser, accessToken) => {
        setGuestModeStored(false);
        setIsGuestMode(false);
        setUser(authUser);
        setToken(accessToken);
        setNeedsAuth(false);
        bootstrapWorkspace(accessToken, authUser.uid);
      },
      (authUser) => {
        if (isGuestModeStored()) {
          setIsGuestMode(true);
          setUser(GUEST_USER_PROFILE);
          setToken(null);
          setNeedsAuth(false);
          bootstrapGuestWorkspace();
          return;
        }
        setUser(authUser);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, [bootstrapWorkspace, bootstrapGuestWorkspace]);

  const handleGuestLogin = () => {
    setAuthError(null);
    setGuestModeStored(true);
    setIsGuestMode(true);
    setUser(GUEST_USER_PROFILE);
    setToken(null);
    setNeedsAuth(false);
    bootstrapGuestWorkspace();
    showToast('Entered Guest Mode — all files are saved locally in your browser');
  };

  const handleLogin = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGuestModeStored(false);
        setIsGuestMode(false);
        setUser(res.user);
        setToken(res.accessToken);
        setNeedsAuth(false);
        await bootstrapWorkspace(res.accessToken, res.user.uid);
      }
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    if (isGuestMode) {
      setGuestModeStored(false);
      setIsGuestMode(false);
    } else {
      await logout();
    }
    setUser(null);
    setToken(null);
    setProjects([]);
    setStandalonePages([]);
    setRootFolder(null);
    setActiveProjectId(null);
    setActiveGroupId(null);
    setActiveStandalonePageId(null);
    setNeedsAuth(true);
  };

  const requireToken = useCallback((): string | null => {
    if (isGuestMode) return null;
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      setNeedsAuth(true);
      return null;
    }
    return activeToken;
  }, [token, isGuestMode]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const activeFolderGroup = useMemo(
    () => folderGroups.find((g) => g.id === activeGroupId) || null,
    [folderGroups, activeGroupId]
  );

  const activeStandalonePage = useMemo(
    () => standalonePages.find((pg) => pg.id === activeStandalonePageId) || null,
    [standalonePages, activeStandalonePageId]
  );

  const updateLocalProject = useCallback(
    (projectId: string, updater: (p: ProjectWorkspace) => ProjectWorkspace) => {
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updater(p) : p)));
    },
    []
  );

  // Create new project inside Folio Workspace folder (or locally in Guest Mode)
  const handleCreateProject = async (
    title: string,
    icon: string,
    coverIndex: number
  ) => {
    if (isGuestMode) {
      const created = createLocalWorkspaceProject(title, icon, coverIndex);
      const assignedGroupId = pendingProjectGroupId;
      const withGroup: ProjectWorkspace = {
        ...created,
        groupId: assignedGroupId || null,
      };
      if (assignedGroupId) {
        saveProjectGroupMap({
          ...projectGroupMap,
          [created.id]: assignedGroupId,
        });
      }
      setPendingProjectGroupId(null);
      setProjects((prev) => [withGroup, ...prev]);
      setActiveProjectId(withGroup.id);
      setActiveArea('project');
      setActiveTab('page');
      logActivity(title, 'Workspace', 'Created local project, tasks & brief');
      showToast(`Created "${title}" locally`);
      return;
    }

    const accessToken = requireToken();
    if (!accessToken || !rootFolder) {
      throw new Error('Google Drive root folder is not ready.');
    }
    const created = await createFullWorkspaceProject(
      accessToken,
      rootFolder.id,
      title,
      icon,
      coverIndex
    );
    const assignedGroupId = pendingProjectGroupId;
    const withGroup: ProjectWorkspace = {
      ...created,
      groupId: assignedGroupId || null,
    };
    if (assignedGroupId) {
      saveProjectGroupMap({
        ...projectGroupMap,
        [created.id]: assignedGroupId,
      });
    }
    setPendingProjectGroupId(null);
    setProjects((prev) => [withGroup, ...prev]);
    setActiveProjectId(withGroup.id);
    setActiveArea('project');
    setActiveTab('page');
    logActivity(title, 'Workspace', 'Created Drive folder, Sheet, and Doc');
    showToast(`Created "${title}" in Google Drive`);
  };

  // Folder Group handlers
  const handleCreateFolderGroup = (name: string, icon: string) => {
    const newGroup: ProjectFolderGroup = {
      id: uid('grp'),
      name: name.trim() || 'Untitled Folder',
      icon: icon || '📁',
      createdAt: new Date().toISOString(),
    };
    const next = [...folderGroups, newGroup];
    saveFolderGroups(next);
    setActiveGroupId(newGroup.id);
    setActiveArea('folder-group');
    showToast(`Created folder "${newGroup.name}"`);
  };

  const handleRenameFolderGroup = (groupId: string, newName: string) => {
    const next = folderGroups.map((g) =>
      g.id === groupId ? { ...g, name: newName } : g
    );
    saveFolderGroups(next);
  };

  const handleChangeFolderGroupIcon = (groupId: string, icon: string) => {
    const next = folderGroups.map((g) =>
      g.id === groupId ? { ...g, icon } : g
    );
    saveFolderGroups(next);
  };

  const handleDeleteFolderGroup = (groupId: string) => {
    const target = folderGroups.find((g) => g.id === groupId);
    if (!target) return;
    const nextGroups = folderGroups.filter((g) => g.id !== groupId);
    saveFolderGroups(nextGroups);
    const nextMap = { ...projectGroupMap };
    Object.keys(nextMap).forEach((pid) => {
      if (nextMap[pid] === groupId) {
        delete nextMap[pid];
      }
    });
    saveProjectGroupMap(nextMap);
    setProjects((prev) =>
      prev.map((p) => (p.groupId === groupId ? { ...p, groupId: null } : p))
    );
    if (activeArea === 'folder-group' && activeGroupId === groupId) {
      setActiveArea('overview');
      setActiveGroupId(null);
    }
    showToast(`Ungrouped folder "${target.name}" (projects kept in workspace)`);
  };

  const handleAssignProjectToGroup = (
    projectId: string,
    groupId: string | null
  ) => {
    const nextMap = { ...projectGroupMap };
    if (groupId) {
      nextMap[projectId] = groupId;
    } else {
      delete nextMap[projectId];
    }
    saveProjectGroupMap(nextMap);
    updateLocalProject(projectId, (p) => ({ ...p, groupId }));
    const targetGroup = folderGroups.find((g) => g.id === groupId);
    showToast(
      targetGroup
        ? `Moved project to "${targetGroup.name}"`
        : 'Removed project from folder'
    );
  };

  // Remove Project from Folio Workspace (keeps files in Google Drive)
  const handleRemoveProjectFromWorkspace = (project: ProjectWorkspace) => {
    setPendingConfirmation({
      title: `Remove "${project.title}" from Folio?`,
      description:
        'This removes the project from your Folio sidebar and overview list. Your Google Drive folder, Google Sheet, and Google Docs will NOT be deleted from Google Drive.',
      details: [
        `Project: ${project.icon} ${project.title}`,
        'Google Drive files remain completely untouched in your Google Drive.',
        'You can restore or re-import this project from Google Drive at any time.',
      ],
      confirmLabel: 'Remove from Here',
      onConfirm: async () => {
        const nextRemoved = { ...removedItemIds, [project.id]: true };
        saveRemovedItemIds(nextRemoved);
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
        if (activeProjectId === project.id) {
          const remaining = projects.filter((p) => p.id !== project.id);
          setActiveProjectId(remaining[0]?.id || null);
          if (activeArea === 'project') {
            setActiveArea('overview');
          }
        }
        showToast(`Removed "${project.title}" from Folio (kept in Google Drive)`);
      },
    });
  };

  // Permanently Delete Project from Google Drive & Folio (or Local Storage in Guest Mode)
  const handleDeleteProjectPermanently = (project: ProjectWorkspace) => {
    if (isGuestMode) {
      setPendingConfirmation({
        title: `Permanently delete "${project.title}" from Local Storage?`,
        description:
          'This will permanently delete this project, its tasks, and all its documents from your local browser storage. This action cannot be undone.',
        details: [`Local Project: "${project.title}"`],
        confirmLabel: 'Delete Permanently',
        danger: true,
        onConfirm: async () => {
          setProjects((prev) => prev.filter((p) => p.id !== project.id));
          if (activeProjectId === project.id) {
            const remaining = projects.filter((p) => p.id !== project.id);
            setActiveProjectId(remaining[0]?.id || null);
            if (activeArea === 'project') {
              setActiveArea('overview');
            }
          }
          logActivity(project.title, 'Workspace', 'Deleted project from local storage');
          showToast(`Deleted "${project.title}" from local storage`);
        },
      });
      return;
    }

    const driveTargets: string[] = [];
    if (project.driveFolderId) {
      driveTargets.push(
        `Google Drive Folder: "${project.driveFolderName || project.title}" (and all files inside it)`
      );
    } else {
      if (project.sheetId) {
        driveTargets.push(
          `Google Sheet: "${project.sheetTitle || 'Tasks'}"`
        );
      }
      if (project.docId) {
        driveTargets.push(`Google Doc: "${project.docTitle || 'Brief'}"`);
      }
    }

    setPendingConfirmation({
      title: `Permanently delete "${project.title}" from Google Drive?`,
      description:
        'This will permanently delete the project from your Google Drive as well as remove it from Folio. This action cannot be undone.',
      details:
        driveTargets.length > 0
          ? driveTargets
          : [`Project "${project.title}" will be permanently deleted.`],
      confirmLabel: 'Delete Permanently from Drive',
      danger: true,
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;

        if (project.driveFolderId) {
          await permanentlyDeleteDriveFile(freshToken, project.driveFolderId);
        } else {
          if (project.sheetId) {
            await permanentlyDeleteDriveFile(freshToken, project.sheetId);
          }
          if (project.docId) {
            await permanentlyDeleteDriveFile(freshToken, project.docId);
          }
        }

        setProjects((prev) => prev.filter((p) => p.id !== project.id));
        if (activeProjectId === project.id) {
          const remaining = projects.filter((p) => p.id !== project.id);
          setActiveProjectId(remaining[0]?.id || null);
          if (activeArea === 'project') {
            setActiveArea('overview');
          }
        }
        logActivity(
          project.title,
          'Drive',
          'Permanently deleted project from Google Drive'
        );
        showToast(`Permanently deleted "${project.title}" from Google Drive`);
      },
    });
  };

  // Workspace-Level Standalone Pages handlers
  const handleCreateWorkspaceStandalonePage = (
    parentDocId: string | null = null,
    initialTitle = 'Untitled Page',
    replaceBlockId?: string
  ) => {
    const cleanTitle = initialTitle.trim() || 'Untitled Page';
    const starterBlocks = buildStandaloneDocStarterBlocks(cleanTitle, 'blank');

    if (isGuestMode) {
      const created = createLocalStandalonePage({
        title: cleanTitle,
        icon: parentDocId ? '📑' : '📄',
        parentDocId,
        blocks: starterBlocks,
      });

      if (parentDocId) {
        const parentPage = standalonePages.find((p) => p.id === parentDocId);
        if (parentPage) {
          const pageBlock: DocBlock = {
            id: replaceBlockId || uid('blk'),
            type: 'page',
            content: created.title,
            docId: created.id,
            docUrl: '',
          };
          const nextParentBlocks = replaceBlockId
            ? parentPage.blocks.map((b) =>
                b.id === replaceBlockId ? pageBlock : b
              )
            : [...parentPage.blocks, pageBlock];
          setStandalonePages((prev) => [
            created,
            ...prev.map((p) =>
              p.id === parentPage.id
                ? { ...p, blocks: nextParentBlocks, dirty: false }
                : p
            ),
          ]);
        } else {
          setStandalonePages((prev) => [created, ...prev]);
        }
      } else {
        setStandalonePages((prev) => [created, ...prev]);
      }

      setActiveStandalonePageId(created.id);
      setActiveArea('standalone-page');
      logActivity(created.title, 'Docs', 'Created local standalone page');
      showToast(`Created standalone page "${created.title}" locally`);
      return;
    }

    const accessToken = requireToken();
    if (!accessToken) return;

    setPendingConfirmation({
      title: `Create Standalone Google Doc Page "${cleanTitle}"?`,
      description:
        'This will create a new standalone Google Doc inside your Folio Workspace folder on Google Drive and open it as a full-screen Notion-style page.',
      details: [
        `Page Title: "${cleanTitle}"`,
        `Location: ${rootFolder?.name || 'Folio Workspace'} (Google Drive)`,
      ],
      confirmLabel: 'Create Standalone Page',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        const created = await createStandaloneWorkspacePage(freshToken, {
          title: cleanTitle,
          icon: parentDocId ? '📑' : '📄',
          rootFolderId: rootFolder?.id || null,
          blocks: starterBlocks,
          parentDocId,
        });

        if (parentDocId) {
          const parentPage = standalonePages.find((p) => p.id === parentDocId);
          if (parentPage) {
            const pageBlock: DocBlock = {
              id: replaceBlockId || uid('blk'),
              type: 'page',
              content: created.title,
              docId: created.id,
              docUrl: created.docUrl,
            };
            const nextParentBlocks = replaceBlockId
              ? parentPage.blocks.map((b) =>
                  b.id === replaceBlockId ? pageBlock : b
                )
              : [...parentPage.blocks, pageBlock];
            await syncBlocksToDoc(freshToken, parentPage.id, nextParentBlocks);
            setStandalonePages((prev) => [
              created,
              ...prev.map((p) =>
                p.id === parentPage.id
                  ? { ...p, blocks: nextParentBlocks, dirty: false }
                  : p
              ),
            ]);
          } else {
            setStandalonePages((prev) => [created, ...prev]);
          }
        } else {
          setStandalonePages((prev) => [created, ...prev]);
        }

        setActiveStandalonePageId(created.id);
        setActiveArea('standalone-page');
        logActivity(
          created.title,
          'Docs',
          'Created standalone Google Doc page'
        );
        showToast(`Created standalone page "${created.title}"`);
      },
    });
  };

  const handlePullStandalonePage = async (page: StandalonePage) => {
    if (isGuestMode) {
      setStandalonePages((prev) =>
        prev.map((p) =>
          p.id === page.id
            ? { ...p, dirty: false, lastSyncedAt: new Date().toISOString() }
            : p
        )
      );
      showToast(`"${page.title}" is up to date in local storage`);
      return;
    }
    const accessToken = requireToken();
    if (!accessToken) return;
    setPullingStandaloneIds((prev) => ({ ...prev, [page.id]: true }));
    try {
      const docData = await fetchDocBlocks(accessToken, page.id);
      setStandalonePages((prev) =>
        prev.map((p) =>
          p.id === page.id
            ? {
                ...p,
                title: docData.docTitle,
                docUrl: docData.docUrl,
                blocks:
                  docData.blocks.length > 0
                    ? docData.blocks
                    : buildStandaloneDocStarterBlocks(docData.docTitle, 'blank'),
                dirty: false,
                lastSyncedAt: new Date().toISOString(),
              }
            : p
        )
      );
      showToast(`Pulled latest Google Doc for "${page.title}"`);
    } catch (err) {
      handleApiError(err);
    } finally {
      setPullingStandaloneIds((prev) => ({ ...prev, [page.id]: false }));
    }
  };

  const handlePushStandalonePage = (page: StandalonePage) => {
    const blocksSnapshot = page.blocks;
    const titleSnapshot = page.title.trim() || 'Untitled Page';
    if (isGuestMode) {
      setStandalonePages((prev) =>
        prev.map((p) =>
          p.id === page.id
            ? {
                ...p,
                title: titleSnapshot,
                dirty: false,
                lastSyncedAt: new Date().toISOString(),
              }
            : p
        )
      );
      logActivity(
        titleSnapshot,
        'Docs',
        `Saved standalone page locally (${blocksSnapshot.length} blocks)`
      );
      showToast(`Saved "${titleSnapshot}" to local storage`);
      return;
    }

    setPendingConfirmation({
      title: `Save "${titleSnapshot}" to Google Docs?`,
      description:
        'This will update the standalone Google Doc in your Google Drive with your latest blocks and title.',
      details: [
        `Google Doc: "${titleSnapshot}"`,
        `Blocks to write: ${blocksSnapshot.length} structured block(s)`,
      ],
      confirmLabel: 'Save to Google Doc',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        setSyncingStandaloneIds((prev) => ({ ...prev, [page.id]: true }));
        try {
          await renameDriveFile(freshToken, page.id, titleSnapshot);
          await syncBlocksToDoc(freshToken, page.id, blocksSnapshot);
          setStandalonePages((prev) =>
            prev.map((p) =>
              p.id === page.id
                ? {
                    ...p,
                    title: titleSnapshot,
                    dirty: false,
                    lastSyncedAt: new Date().toISOString(),
                  }
                : p
            )
          );
          logActivity(
            titleSnapshot,
            'Docs',
            `Synced standalone page (${blocksSnapshot.length} blocks)`
          );
          showToast(`Saved "${titleSnapshot}" to Google Docs`);
        } finally {
          setSyncingStandaloneIds((prev) => ({ ...prev, [page.id]: false }));
        }
      },
    });
  };

  const handleRemoveStandalonePageFromWorkspace = (page: StandalonePage) => {
    setPendingConfirmation({
      title: `Remove "${page.title}" from Folio?`,
      description: isGuestMode
        ? 'This hides the standalone page from your sidebar list.'
        : 'This removes the standalone page from your Folio sidebar while keeping the Google Doc safely in your Google Drive.',
      details: [
        `Page: ${page.icon} ${page.title}`,
        isGuestMode
          ? 'Removed from active workspace list.'
          : 'The Google Doc remains untouched in your Google Drive.',
      ],
      confirmLabel: 'Remove from Here',
      onConfirm: async () => {
        const nextRemoved = { ...removedItemIds, [page.id]: true };
        saveRemovedItemIds(nextRemoved);
        setStandalonePages((prev) => prev.filter((p) => p.id !== page.id));
        if (activeStandalonePageId === page.id) {
          setActiveStandalonePageId(null);
          setActiveArea('overview');
        }
        showToast(`Removed "${page.title}" from Folio`);
      },
    });
  };

  const handleDeleteStandalonePagePermanently = (page: StandalonePage) => {
    if (isGuestMode) {
      setPendingConfirmation({
        title: `Permanently delete "${page.title}"?`,
        description:
          'This will permanently delete this standalone page from your local browser storage.',
        details: [`Standalone Page: "${page.title}"`],
        confirmLabel: 'Delete Permanently',
        danger: true,
        onConfirm: async () => {
          setStandalonePages((prev) => prev.filter((p) => p.id !== page.id));
          if (activeStandalonePageId === page.id) {
            setActiveStandalonePageId(null);
            setActiveArea('overview');
          }
          logActivity(page.title, 'Docs', 'Deleted standalone page from local storage');
          showToast(`Deleted "${page.title}" from local storage`);
        },
      });
      return;
    }

    setPendingConfirmation({
      title: `Permanently delete "${page.title}" from Google Drive?`,
      description:
        'This will permanently delete this standalone Google Doc from your Google Drive and remove it from Folio. This action cannot be undone.',
      details: [`Google Doc: "${page.title}"`],
      confirmLabel: 'Delete Permanently from Drive',
      danger: true,
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        await permanentlyDeleteDriveFile(freshToken, page.id);
        setStandalonePages((prev) => prev.filter((p) => p.id !== page.id));
        if (activeStandalonePageId === page.id) {
          setActiveStandalonePageId(null);
          setActiveArea('overview');
        }
        logActivity(
          page.title,
          'Docs',
          'Permanently deleted standalone Google Doc from Drive'
        );
        showToast(`Permanently deleted "${page.title}" from Google Drive`);
      },
    });
  };

  const handleAddStandalonePageToProject = (projectId: string) => {
    const targetProject = projects.find((p) => p.id === projectId);
    if (!targetProject) return;
    setActiveProjectId(projectId);
    setActiveArea('project');
    setActiveTab('docs');
    const defaultTitle = `${targetProject.title} — Page ${
      targetProject.extraDocs.length + 1
    }`;
    const starterBlocks = buildStandaloneDocStarterBlocks(defaultTitle, 'spec');
    handleCreateStandaloneDoc(targetProject, defaultTitle, starterBlocks);
  };

  // Pull latest from Google Sheets, Docs & Drive (or verify local storage in Guest Mode)
  const executePullProject = useCallback(
    async (project: ProjectWorkspace, silent = false) => {
      if (isGuestMode) {
        updateLocalProject(project.id, (p) => ({
          ...p,
          lastSyncedAt: new Date().toISOString(),
          dirtyDoc: false,
          dirtyTasks: false,
        }));
        if (!silent) {
          showToast(`"${project.title}" is saved in local storage`);
        }
        return;
      }

      const accessToken = requireToken();
      if (!accessToken) return;
      if (!silent) {
        setIsPullingId(project.id);
        setWorkspaceError(null);
      }
      try {
        const [sheetRes, docRes, filesRes] = await Promise.all([
          project.sheetId
            ? fetchSheetTasks(accessToken, project.sheetId)
            : Promise.resolve(null),
          project.docId
            ? fetchDocBlocks(accessToken, project.docId)
            : Promise.resolve(null),
          project.driveFolderId
            ? listFolderFiles(accessToken, project.driveFolderId)
            : Promise.resolve(null),
        ]);

        updateLocalProject(project.id, (p) => {
          if (hasProjectDirty(p) || syncingRef.current[p.id]) {
            return p;
          }
          const prevTaskMap = new Map(p.tasks.map((t) => [t.id, t]));
          const mergedTasks = sheetRes
            ? sheetRes.tasks.map((t) => {
                const existingTask = prevTaskMap.get(t.id);
                if (existingTask && existingTask.docId === t.docId) {
                  return {
                    ...t,
                    docTitle: existingTask.docTitle,
                    docBlocks: existingTask.docBlocks,
                    dirtyTaskDoc: existingTask.dirtyTaskDoc,
                  };
                }
                return t;
              })
            : p.tasks;

          const prevExtraDocMap = new Map(p.extraDocs.map((d) => [d.id, d]));
          const nextExtraDocs: ProjectDocPage[] = filesRes
            ? filesRes
                .filter(
                  (f) =>
                    f.mimeType === 'application/vnd.google-apps.document' &&
                    f.appProperties?.folioTaskDoc !== 'true' &&
                    f.id !== p.docId
                )
                .map((f) => {
                  const prevDoc = prevExtraDocMap.get(f.id);
                  return {
                    id: f.id,
                    title: f.name,
                    url:
                      f.webViewLink ||
                      prevDoc?.url ||
                      `https://docs.google.com/document/d/${f.id}/edit`,
                    parentDocId:
                      f.appProperties?.folioParentDocId ||
                      prevDoc?.parentDocId ||
                      null,
                    modifiedTime: f.modifiedTime,
                    blocks: prevDoc?.blocks,
                    dirty: false,
                  };
                })
            : p.extraDocs;

          return {
            ...p,
            tasks: mergedTasks,
            sheetTitle: sheetRes ? sheetRes.sheetTitle : p.sheetTitle,
            sheetTabName: sheetRes ? sheetRes.sheetTabName : p.sheetTabName,
            sheetUrl: sheetRes ? sheetRes.sheetUrl : p.sheetUrl,
            blocks: docRes && docRes.blocks.length > 0 ? docRes.blocks : p.blocks,
            docTitle: docRes ? docRes.docTitle : p.docTitle,
            docUrl: docRes ? docRes.docUrl : p.docUrl,
            extraDocs: nextExtraDocs,
            driveFiles: filesRes ? filesRes : p.driveFiles,
            lastSyncedAt: new Date().toISOString(),
            dirtyDoc: false,
            dirtyTasks: false,
          };
        });
        if (!silent) {
          logActivity(project.title, 'Workspace', 'Pulled latest Sheets, Docs & Drive state');
          showToast(`Pulled latest updates for "${project.title}"`);
        }
      } catch (err) {
        if (!silent) {
          handleApiError(err);
        }
      } finally {
        if (!silent) {
          setIsPullingId(null);
        }
      }
    },
    [handleApiError, hasProjectDirty, isGuestMode, logActivity, requireToken, showToast, updateLocalProject]
  );

  const handlePullProject = (project: ProjectWorkspace) => {
    if (isGuestMode) {
      executePullProject(project);
      return;
    }
    if (hasProjectDirty(project)) {
      const dirtyTaskDocsCount = project.tasks.filter((t) => t.dirtyTaskDoc).length;
      const dirtyExtraDocsCount = project.extraDocs.filter((d) => d.dirty).length;
      setPendingConfirmation({
        title: `Discard unsynced edits in "${project.title}"?`,
        description:
          'Pulling from Google Workspace will replace your local unsynced changes with the latest version from Google Sheets and Google Docs.',
        details: [
          project.dirtyTasks
            ? 'Local task edits will be overwritten by the connected Google Sheet.'
            : 'Task sheet has no local edits.',
          project.dirtyDoc
            ? 'Local page block edits will be overwritten by the connected Google Doc.'
            : 'Brief document has no local edits.',
          ...(dirtyTaskDocsCount > 0
            ? [
                `${dirtyTaskDocsCount} task Google Doc(s) have unsynced local edits that would be discarded.`,
              ]
            : []),
          ...(dirtyExtraDocsCount > 0
            ? [
                `${dirtyExtraDocsCount} standalone Google Doc page(s) have unsynced local edits that would be discarded.`,
              ]
            : []),
        ],
        confirmLabel: 'Pull & Overwrite Local',
        danger: true,
        onConfirm: () => executePullProject(project),
      });
      return;
    }
    executePullProject(project);
  };

  const handlePullAll = () => {
    if (isGuestMode) {
      showToast('All Guest Mode projects are saved in local browser storage.');
      return;
    }
    const cleanProjects = projects.filter(
      (p) => !hasProjectDirty(p) && !syncingRef.current[p.id]
    );
    if (cleanProjects.length === 0) {
      showToast('All clean projects are up to date.');
      return;
    }
    cleanProjects.forEach((p) => {
      executePullProject(p, true);
    });
    showToast(`Refreshed ${cleanProjects.length} project(s) from Google Workspace`);
  };

  const executePushProject = useCallback(
    async (projectSnapshot: ProjectWorkspace, silent = false) => {
      if (isGuestMode) {
        updateLocalProject(projectSnapshot.id, (p) => ({
          ...p,
          driveFolderName: p.title.trim() || p.driveFolderName,
          dirtyTasks: false,
          dirtyDoc: false,
          tasks: p.tasks.map((t) => ({ ...t, dirtyTaskDoc: false })),
          extraDocs: p.extraDocs.map((d) => ({ ...d, dirty: false })),
          lastSyncedAt: new Date().toISOString(),
        }));
        logActivity(
          projectSnapshot.title,
          'Workspace',
          'Saved all project changes to local browser storage'
        );
        if (!silent) {
          showToast(`Saved "${projectSnapshot.title}" locally`);
        }
        return;
      }

      const freshToken = requireToken();
      if (!freshToken) throw new Error('Session expired.');
      if (syncingRef.current[projectSnapshot.id]) return;

      syncingRef.current[projectSnapshot.id] = true;
      setSyncingIds((prev) => ({ ...prev, [projectSnapshot.id]: true }));

      try {
        if (projectSnapshot.dirtyTasks && projectSnapshot.sheetId) {
          await syncTasksToSheet(
            freshToken,
            projectSnapshot.sheetId,
            projectSnapshot.sheetTabName || 'Tasks',
            projectSnapshot.tasks
          );
          logActivity(
            projectSnapshot.title,
            'Sheets',
            `Synced ${projectSnapshot.tasks.length} task rows`
          );
        }

        if (projectSnapshot.dirtyDoc && projectSnapshot.docId) {
          await syncBlocksToDoc(
            freshToken,
            projectSnapshot.docId,
            projectSnapshot.blocks
          );
          logActivity(
            projectSnapshot.title,
            'Docs',
            `Synced ${projectSnapshot.blocks.length} document blocks`
          );
        }

        const dirtyTaskDocs = projectSnapshot.tasks.filter(
          (t) => t.dirtyTaskDoc && t.docId && t.docBlocks
        );
        const syncedTaskDocSnapshots = new Map<string, DocBlock[]>();

        for (const task of dirtyTaskDocs) {
          if (!task.docId || !task.docBlocks) continue;
          setSyncingTaskDocIds((prev) => ({ ...prev, [task.id]: true }));
          try {
            await syncBlocksToDoc(freshToken, task.docId, task.docBlocks);
            syncedTaskDocSnapshots.set(task.id, task.docBlocks);
            logActivity(
              projectSnapshot.title,
              'Docs',
              `Synced task doc "${task.docTitle || task.title}" (${task.docBlocks.length} blocks)`
            );
          } finally {
            setSyncingTaskDocIds((prev) => ({ ...prev, [task.id]: false }));
          }
        }

        const dirtyExtraDocs = projectSnapshot.extraDocs.filter(
          (d) => d.dirty && d.blocks
        );
        const syncedExtraDocSnapshots = new Map<string, DocBlock[]>();

        for (const extraDoc of dirtyExtraDocs) {
          if (!extraDoc.blocks) continue;
          setSyncingExtraDocIds((prev) => ({ ...prev, [extraDoc.id]: true }));
          try {
            await syncBlocksToDoc(freshToken, extraDoc.id, extraDoc.blocks);
            syncedExtraDocSnapshots.set(extraDoc.id, extraDoc.blocks);
            logActivity(
              projectSnapshot.title,
              'Docs',
              `Synced doc page "${extraDoc.title}" (${extraDoc.blocks.length} blocks)`
            );
          } finally {
            setSyncingExtraDocIds((prev) => ({ ...prev, [extraDoc.id]: false }));
          }
        }

        let nextFolderName = projectSnapshot.driveFolderName;
        if (
          projectSnapshot.driveFolderId &&
          projectSnapshot.driveFolderName &&
          projectSnapshot.title.trim() &&
          projectSnapshot.title.trim() !== projectSnapshot.driveFolderName
        ) {
          await renameDriveFile(
            freshToken,
            projectSnapshot.driveFolderId,
            projectSnapshot.title.trim()
          );
          nextFolderName = projectSnapshot.title.trim();
          logActivity(
            projectSnapshot.title,
            'Drive',
            `Renamed folder to "${nextFolderName}"`
          );
        }

        updateLocalProject(projectSnapshot.id, (p) => {
          const sameTasks = p.tasks === projectSnapshot.tasks;
          const sameBlocks = p.blocks === projectSnapshot.blocks;
          const sameTitle = p.title === projectSnapshot.title;
          const updatedTasks = p.tasks.map((t) => {
            const pushedBlocks = syncedTaskDocSnapshots.get(t.id);
            if (pushedBlocks && t.docBlocks === pushedBlocks) {
              return { ...t, dirtyTaskDoc: false };
            }
            return t;
          });
          const updatedExtraDocs = p.extraDocs.map((d) => {
            const pushedBlocks = syncedExtraDocSnapshots.get(d.id);
            if (pushedBlocks && d.blocks === pushedBlocks) {
              return { ...d, dirty: false };
            }
            return d;
          });
          return {
            ...p,
            tasks: updatedTasks,
            extraDocs: updatedExtraDocs,
            driveFolderName: nextFolderName,
            dirtyTasks: sameTasks ? false : p.dirtyTasks,
            dirtyDoc: sameBlocks && sameTitle ? false : p.dirtyDoc,
            lastSyncedAt: new Date().toISOString(),
          };
        });

        if (!silent) {
          showToast(`Synced "${projectSnapshot.title}" across Google Workspace`);
        }
      } finally {
        syncingRef.current[projectSnapshot.id] = false;
        setSyncingIds((prev) => ({ ...prev, [projectSnapshot.id]: false }));
      }
    },
    [isGuestMode, logActivity, requireToken, showToast, updateLocalProject]
  );

  // Explicit opt-in confirmation for enabling automatic background sync
  const handleToggleAutoSync = () => {
    if (autoSyncEnabled) {
      setAutoSyncEnabled(false);
      showToast('Auto-Sync turned off');
      return;
    }

    const connectedTargets = projects
      .slice(0, 5)
      .map(
        (p) =>
          `${p.title}: ${[
            p.sheetTitle ? `Sheet "${p.sheetTitle}"` : null,
            p.docTitle ? `Doc "${p.docTitle}"` : null,
          ]
            .filter(Boolean)
            .join(' & ') || 'Linked Workspace files'}`
      );

    setPendingConfirmation({
      title: 'Enable Automatic Sync with Google Workspace?',
      description:
        'When Auto-Sync is enabled, edits you make to tasks, task Google Docs, pages, and project titles in Folio will automatically update your connected Google Sheets, Google Docs, and Google Drive folders after you pause editing.',
      details: [
        ...(connectedTargets.length > 0
          ? connectedTargets
          : ['Connected Google Sheets, Docs, and Drive folders will stay in sync automatically.']),
        'Destructive actions (moving files to Trash or renaming individual Drive files) will still ask for confirmation.',
      ],
      confirmLabel: 'Enable Auto-Sync',
      onConfirm: async () => {
        setAutoSyncEnabled(true);
        const dirtyNow = projectsRef.current.filter((p) => hasProjectDirty(p));
        for (const p of dirtyNow) {
          await executePushProject(p, true);
        }
        showToast('Auto-Sync enabled across Google Workspace');
      },
    });
  };

  // Debounced background Auto-Push when Auto-Sync is enabled
  useEffect(() => {
    if (!autoSyncEnabled || needsAuth || !token) return;
    const dirtyProjects = projects.filter(
      (p) => hasProjectDirty(p) && !syncingIds[p.id]
    );
    if (dirtyProjects.length === 0) return;

    const timer = setTimeout(() => {
      for (const proj of dirtyProjects) {
        executePushProject(proj, true).catch((err) => {
          handleApiError(err);
        });
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [
    autoSyncEnabled,
    projects,
    syncingIds,
    needsAuth,
    token,
    hasProjectDirty,
    executePushProject,
    handleApiError,
  ]);

  // Automatic read-only Auto-Pull on window focus & 20s interval when project has no unsynced local edits
  useEffect(() => {
    if (needsAuth || !token) return;

    const pullActiveIfClean = () => {
      const current = projectsRef.current.find((p) => p.id === activeProjectId);
      if (
        current &&
        !hasProjectDirty(current) &&
        !syncingRef.current[current.id]
      ) {
        executePullProject(current, true);
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        pullActiveIfClean();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    const interval = setInterval(pullActiveIfClean, 20000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, [needsAuth, token, activeProjectId, hasProjectDirty, executePullProject]);

  // Manual push with explicit confirmation (or immediate local save in Guest Mode)
  const handlePushProject = (project: ProjectWorkspace) => {
    if (isGuestMode) {
      executePushProject(project, false);
      return;
    }

    const accessToken = requireToken();
    if (!accessToken) return;

    const details: string[] = [];
    if (project.dirtyTasks && project.sheetId) {
      details.push(
        `Google Sheets ("${project.sheetTitle || 'Tasks'}"): Write ${project.tasks.length} task row(s) to tab "${project.sheetTabName || 'Tasks'}".`
      );
    }
    if (project.dirtyDoc && project.docId) {
      details.push(
        `Google Docs ("${project.docTitle || 'Brief'}"): Replace document body with ${project.blocks.length} structured block(s).`
      );
    }
    const dirtyTaskDocs = project.tasks.filter(
      (t) => t.dirtyTaskDoc && t.docId && t.docBlocks
    );
    for (const td of dirtyTaskDocs) {
      details.push(
        `Task Google Doc ("${td.docTitle || td.title}"): Write ${td.docBlocks?.length || 0} structured block(s).`
      );
    }
    const dirtyExtraDocs = project.extraDocs.filter(
      (d) => d.dirty && d.blocks
    );
    for (const ed of dirtyExtraDocs) {
      details.push(
        `Document Page ("${ed.title}"): Write ${ed.blocks?.length || 0} structured block(s).`
      );
    }
    if (
      project.driveFolderId &&
      project.driveFolderName &&
      project.title.trim() &&
      project.title.trim() !== project.driveFolderName
    ) {
      details.push(
        `Google Drive: Rename folder "${project.driveFolderName}" to "${project.title.trim()}".`
      );
    }

    if (details.length === 0) {
      showToast('Project is already in sync with Google Workspace.');
      return;
    }

    setPendingConfirmation({
      title: `Sync "${project.title}" to Google Workspace?`,
      description:
        'Confirm updating your connected Google Drive, Sheets, and Docs files with the changes made in Folio.',
      details,
      confirmLabel: 'Confirm & Sync',
      onConfirm: () => executePushProject(project, false),
    });
  };

  // Upload local file to Drive folder (or save locally in Guest Mode)
  const handleUploadFile = (project: ProjectWorkspace, file: File) => {
    if (isGuestMode) {
      const addLocalFileItem = (dataUrl?: string) => {
        const localFile: DriveFileItem = {
          id: uid('local_file'),
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          webViewLink: dataUrl,
          modifiedTime: new Date().toISOString(),
          size: String(file.size),
        };
        updateLocalProject(project.id, (p) => ({
          ...p,
          driveFiles: [localFile, ...p.driveFiles],
          lastSyncedAt: new Date().toISOString(),
        }));
        logActivity(project.title, 'Drive', `Saved file "${file.name}" locally`);
        showToast(`Saved "${file.name}" to local storage`);
      };

      if (file.size <= 2 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          addLocalFileItem(
            typeof reader.result === 'string' ? reader.result : undefined
          );
        };
        reader.onerror = () => addLocalFileItem();
        reader.readAsDataURL(file);
      } else {
        addLocalFileItem(URL.createObjectURL(file));
      }
      return;
    }

    const accessToken = requireToken();
    if (!accessToken || !project.driveFolderId) return;

    setPendingConfirmation({
      title: `Upload "${file.name}" to Google Drive?`,
      description: `This will upload the selected file into the "${
        project.driveFolderName || project.title
      }" folder on Google Drive.`,
      details: [
        `File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        `Target folder: ${project.driveFolderName || project.title}`,
      ],
      confirmLabel: 'Upload File',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken || !project.driveFolderId) return;
        const uploaded = await uploadFileToDriveFolder(
          freshToken,
          project.driveFolderId,
          file
        );
        updateLocalProject(project.id, (p) => ({
          ...p,
          driveFiles: [uploaded, ...p.driveFiles],
        }));
        logActivity(project.title, 'Drive', `Uploaded "${file.name}"`);
        showToast(`Uploaded "${file.name}" to Google Drive`);
      },
    });
  };

  // Rename Drive file (or local file in Guest Mode)
  const handleRenameFile = (
    project: ProjectWorkspace,
    file: DriveFileItem,
    newName: string
  ) => {
    if (isGuestMode) {
      updateLocalProject(project.id, (p) => ({
        ...p,
        driveFiles: p.driveFiles.map((f) =>
          f.id === file.id ? { ...f, name: newName } : f
        ),
        extraDocs: p.extraDocs.map((d) =>
          d.id === file.id ? { ...d, title: newName } : d
        ),
        sheetTitle: p.sheetId === file.id ? newName : p.sheetTitle,
        docTitle: p.docId === file.id ? newName : p.docTitle,
      }));
      logActivity(project.title, 'Drive', `Renamed "${file.name}" to "${newName}" locally`);
      showToast(`Renamed to "${newName}"`);
      return;
    }

    setPendingConfirmation({
      title: `Rename "${file.name}" in Google Drive?`,
      description: 'This updates the file name directly in your Google Drive.',
      details: [`Current name: ${file.name}`, `New name: ${newName}`],
      confirmLabel: 'Rename File',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        await renameDriveFile(freshToken, file.id, newName);
        updateLocalProject(project.id, (p) => ({
          ...p,
          driveFiles: p.driveFiles.map((f) =>
            f.id === file.id ? { ...f, name: newName } : f
          ),
          extraDocs: p.extraDocs.map((d) =>
            d.id === file.id ? { ...d, title: newName } : d
          ),
          sheetTitle: p.sheetId === file.id ? newName : p.sheetTitle,
          docTitle: p.docId === file.id ? newName : p.docTitle,
        }));
        logActivity(project.title, 'Drive', `Renamed "${file.name}" to "${newName}"`);
        showToast(`Renamed to "${newName}"`);
      },
    });
  };

  // Move Drive file to Trash (or remove local file in Guest Mode)
  const handleTrashFile = (project: ProjectWorkspace, file: DriveFileItem) => {
    if (isGuestMode) {
      setPendingConfirmation({
        title: `Delete "${file.name}" from Local Storage?`,
        description:
          'This removes the file from your local project files list.',
        details: [
          `File: ${file.name}`,
          `Project: ${project.title}`,
        ],
        confirmLabel: 'Delete File',
        danger: true,
        onConfirm: async () => {
          updateLocalProject(project.id, (p) => ({
            ...p,
            driveFiles: p.driveFiles.filter((f) => f.id !== file.id),
            extraDocs: p.extraDocs.filter((d) => d.id !== file.id),
            sheetId: p.sheetId === file.id ? null : p.sheetId,
            sheetUrl: p.sheetId === file.id ? null : p.sheetUrl,
            docId: p.docId === file.id ? null : p.docId,
            docUrl: p.docId === file.id ? null : p.docUrl,
          }));
          logActivity(project.title, 'Drive', `Deleted "${file.name}" locally`);
          showToast(`Deleted "${file.name}"`);
        },
      });
      return;
    }

    setPendingConfirmation({
      title: `Move "${file.name}" to Google Drive Trash?`,
      description:
        'This moves the file to Trash in your Google Drive. You can restore it from Google Drive Trash if needed.',
      details: [
        `File: ${file.name}`,
        `Folder: ${project.driveFolderName || project.title}`,
      ],
      confirmLabel: 'Move to Trash',
      danger: true,
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        await trashDriveFile(freshToken, file.id);
        updateLocalProject(project.id, (p) => ({
          ...p,
          driveFiles: p.driveFiles.filter((f) => f.id !== file.id),
          extraDocs: p.extraDocs.filter((d) => d.id !== file.id),
          sheetId: p.sheetId === file.id ? null : p.sheetId,
          sheetUrl: p.sheetId === file.id ? null : p.sheetUrl,
          docId: p.docId === file.id ? null : p.docId,
          docUrl: p.docId === file.id ? null : p.docUrl,
        }));
        logActivity(project.title, 'Drive', `Moved "${file.name}" to Trash`);
        showToast(`Moved "${file.name}" to Trash`);
      },
    });
  };

  // Refresh Drive folder file list
  const handleRefreshDriveFolder = async (project: ProjectWorkspace) => {
    if (isGuestMode) {
      showToast('Local files list is up to date');
      return;
    }
    const accessToken = requireToken();
    if (!accessToken || !project.driveFolderId) return;
    try {
      const files = await listFolderFiles(accessToken, project.driveFolderId);
      updateLocalProject(project.id, (p) => ({ ...p, driveFiles: files }));
      showToast('Drive folder refreshed');
    } catch (err) {
      handleApiError(err);
    }
  };

  // Per-task Google Doc handlers
  const handleLoadTaskDoc = useCallback(
    async (project: ProjectWorkspace, task: TaskItem) => {
      if (isGuestMode) {
        if (!task.docBlocks || task.docBlocks.length === 0) {
          updateLocalProject(project.id, (p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    docBlocks: buildTaskDocStarterBlocks(t, 'blank'),
                    dirtyTaskDoc: false,
                  }
                : t
            ),
          }));
        }
        return;
      }
      const accessToken = requireToken();
      if (!accessToken || !task.docId) return;
      setLoadingTaskDocIds((prev) => ({ ...prev, [task.id]: true }));
      try {
        const docData = await fetchDocBlocks(accessToken, task.docId);
        updateLocalProject(project.id, (p) => ({
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  docTitle: docData.docTitle,
                  docUrl: docData.docUrl,
                  docBlocks:
                    docData.blocks.length > 0
                      ? docData.blocks
                      : buildTaskDocStarterBlocks(t, 'blank'),
                  dirtyTaskDoc: false,
                }
              : t
          ),
        }));
      } catch (err) {
        handleApiError(err);
      } finally {
        setLoadingTaskDocIds((prev) => ({ ...prev, [task.id]: false }));
      }
    },
    [handleApiError, isGuestMode, requireToken, updateLocalProject]
  );

  const executePullTaskDoc = async (project: ProjectWorkspace, task: TaskItem) => {
    await handleLoadTaskDoc(project, task);
    showToast(
      isGuestMode
        ? `"${task.title}" document is saved locally`
        : `Pulled latest Google Doc for "${task.title}"`
    );
  };

  const handlePullTaskDoc = async (project: ProjectWorkspace, task: TaskItem) => {
    if (!task.docId) return;
    if (isGuestMode) {
      await executePullTaskDoc(project, task);
      return;
    }
    if (task.dirtyTaskDoc) {
      setPendingConfirmation({
        title: `Discard unsynced edits in "${task.docTitle || task.title}"?`,
        description:
          'Pulling from Google Docs will overwrite your unsynced local document edits for this task.',
        details: [`Task: ${task.title}`, `Google Doc: ${task.docTitle || task.title}`],
        confirmLabel: 'Pull & Overwrite',
        danger: true,
        onConfirm: () => executePullTaskDoc(project, task),
      });
      return;
    }
    await executePullTaskDoc(project, task);
  };

  const handlePushTaskDoc = (project: ProjectWorkspace, task: TaskItem) => {
    if (!task.docId || !task.docBlocks) return;
    const blocksSnapshot = task.docBlocks;
    if (isGuestMode) {
      updateLocalProject(project.id, (p) => ({
        ...p,
        lastSyncedAt: new Date().toISOString(),
        tasks: p.tasks.map((t) =>
          t.id === task.id ? { ...t, dirtyTaskDoc: false } : t
        ),
      }));
      logActivity(
        project.title,
        'Docs',
        `Saved task doc "${task.docTitle || task.title}" locally`
      );
      showToast(`Saved "${task.docTitle || task.title}" to local storage`);
      return;
    }

    setPendingConfirmation({
      title: `Save "${task.docTitle || task.title}" to Google Docs?`,
      description:
        'This will update the linked Google Doc body with the blocks you edited in Folio.',
      details: [
        `Google Doc: "${task.docTitle || task.title}"`,
        `Blocks to write: ${blocksSnapshot.length} structured block(s)`,
      ],
      confirmLabel: 'Save to Google Doc',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken || !task.docId) return;
        setSyncingTaskDocIds((prev) => ({ ...prev, [task.id]: true }));
        try {
          await syncBlocksToDoc(freshToken, task.docId, blocksSnapshot);
          updateLocalProject(project.id, (p) => ({
            ...p,
            lastSyncedAt: new Date().toISOString(),
            tasks: p.tasks.map((t) =>
              t.id === task.id && t.docBlocks === blocksSnapshot
                ? { ...t, dirtyTaskDoc: false }
                : t
            ),
          }));
          logActivity(
            project.title,
            'Docs',
            `Saved task doc "${task.docTitle || task.title}"`
          );
          showToast(`Saved "${task.docTitle || task.title}" to Google Docs`);
        } finally {
          setSyncingTaskDocIds((prev) => ({ ...prev, [task.id]: false }));
        }
      },
    });
  };

  const handleCreateTaskDoc = (
    project: ProjectWorkspace,
    task: TaskItem,
    docTitle: string,
    blocks: DocBlock[]
  ) => {
    const cleanTitle = docTitle.trim() || task.title.trim() || 'Untitled Task Document';
    if (isGuestMode) {
      const localDocId = uid('local_tdoc');
      const nowIso = new Date().toISOString();
      const newDriveItem: DriveFileItem = {
        id: localDocId,
        name: cleanTitle,
        mimeType: 'application/vnd.google-apps.document',
        modifiedTime: nowIso,
        appProperties: { folioTaskDoc: 'true', folioTaskId: task.id },
      };
      updateLocalProject(project.id, (p) => ({
        ...p,
        tasks: p.tasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                docId: localDocId,
                docUrl: '',
                docTitle: cleanTitle,
                docBlocks: blocks,
                dirtyTaskDoc: false,
              }
            : t
        ),
        driveFiles: [newDriveItem, ...p.driveFiles],
        lastSyncedAt: nowIso,
      }));
      logActivity(
        project.title,
        'Docs',
        `Created local task document "${cleanTitle}"`
      );
      showToast(`Created task document "${cleanTitle}" locally`);
      return;
    }

    const accessToken = requireToken();
    if (!accessToken) return;

    setPendingConfirmation({
      title: `Create Google Doc for "${task.title || 'Untitled task'}"?`,
      description:
        'This will create a new Google Doc inside your Drive "Task Docs" folder, write your document blocks into it, and link its Doc ID and URL in your project Sheet.',
      details: [
        `New Google Doc: "${cleanTitle}" (${blocks.length} blocks)`,
        `Drive location: ${project.driveFolderName || 'Folio Workspace'} / Task Docs`,
        ...(project.sheetId
          ? [`Google Sheet "${project.sheetTitle || 'Tasks'}": Save linked Doc ID & URL.`]
          : []),
      ],
      confirmLabel: 'Create & Link Google Doc',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        const created = await createTaskDocument(freshToken, {
          title: cleanTitle,
          projectFolderId: project.driveFolderId,
          rootFolderId: rootFolder?.id || null,
          taskId: task.id,
          blocks,
        });

        const latestProject =
          projectsRef.current.find((p) => p.id === project.id) || project;
        const nextTasks = latestProject.tasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                docId: created.documentId,
                docUrl: created.documentUrl,
                docTitle: created.docTitle,
                docBlocks: blocks,
                dirtyTaskDoc: false,
              }
            : t
        );

        if (latestProject.sheetId) {
          await syncTasksToSheet(
            freshToken,
            latestProject.sheetId,
            latestProject.sheetTabName || 'Tasks',
            nextTasks
          );
        }

        updateLocalProject(project.id, (p) => ({
          ...p,
          tasks: nextTasks,
          dirtyTasks: latestProject.sheetId ? false : p.dirtyTasks,
          lastSyncedAt: new Date().toISOString(),
        }));
        logActivity(
          project.title,
          'Docs',
          `Created & linked task doc "${created.docTitle}"`
        );
        showToast(`Created Google Doc "${created.docTitle}"`);
      },
    });
  };

  const handleCreateMissingTaskDocs = (project: ProjectWorkspace) => {
    const unlinked = project.tasks.filter((t) => !t.docId);
    if (unlinked.length === 0) {
      showToast('Every task already has a linked document.');
      return;
    }

    if (isGuestMode) {
      const nowIso = new Date().toISOString();
      const newDriveItems: DriveFileItem[] = [];
      updateLocalProject(project.id, (p) => ({
        ...p,
        tasks: p.tasks.map((t) => {
          if (t.docId) return t;
          const localDocId = uid('local_tdoc');
          const cleanTitle = t.title.trim() || 'Untitled task';
          const blocks = buildTaskDocStarterBlocks(t, 'spec');
          newDriveItems.push({
            id: localDocId,
            name: cleanTitle,
            mimeType: 'application/vnd.google-apps.document',
            modifiedTime: nowIso,
            appProperties: { folioTaskDoc: 'true', folioTaskId: t.id },
          });
          return {
            ...t,
            docId: localDocId,
            docUrl: '',
            docTitle: cleanTitle,
            docBlocks: blocks,
            dirtyTaskDoc: false,
          };
        }),
        driveFiles: [...newDriveItems, ...p.driveFiles],
        lastSyncedAt: nowIso,
      }));
      logActivity(
        project.title,
        'Docs',
        `Created ${unlinked.length} local task document(s)`
      );
      showToast(`Created ${unlinked.length} local task document(s)`);
      return;
    }

    const accessToken = requireToken();
    if (!accessToken) return;

    setPendingConfirmation({
      title: `Create ${unlinked.length} Google Doc${unlinked.length > 1 ? 's' : ''} for unlinked tasks?`,
      description:
        'Each task without a linked document will receive a new structured Google Doc in Drive ("Task Docs" folder), and its Doc ID and URL will be saved in your Google Sheet.',
      details: [
        ...unlinked
          .slice(0, 5)
          .map((t) => `Create Google Doc "${t.title || 'Untitled task'}"`),
        ...(unlinked.length > 5
          ? [`...and ${unlinked.length - 5} more task(s)`]
          : []),
        ...(project.sheetId
          ? [`Update Google Sheet "${project.sheetTitle || 'Tasks'}" with all Doc links.`]
          : []),
      ],
      confirmLabel: `Create ${unlinked.length} Google Doc${unlinked.length > 1 ? 's' : ''}`,
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        const createdMap = new Map<
          string,
          { docId: string; docUrl: string; docTitle: string; docBlocks: DocBlock[] }
        >();

        for (const task of unlinked) {
          const blocks = buildTaskDocStarterBlocks(task, 'spec');
          const created = await createTaskDocument(freshToken, {
            title: task.title.trim() || 'Untitled task',
            projectFolderId: project.driveFolderId,
            rootFolderId: rootFolder?.id || null,
            taskId: task.id,
            blocks,
          });
          createdMap.set(task.id, {
            docId: created.documentId,
            docUrl: created.documentUrl,
            docTitle: created.docTitle,
            docBlocks: blocks,
          });
        }

        const latestProject =
          projectsRef.current.find((p) => p.id === project.id) || project;
        const nextTasks = latestProject.tasks.map((t) => {
          const created = createdMap.get(t.id);
          return created
            ? {
                ...t,
                docId: created.docId,
                docUrl: created.docUrl,
                docTitle: created.docTitle,
                docBlocks: created.docBlocks,
                dirtyTaskDoc: false,
              }
            : t;
        });

        if (latestProject.sheetId) {
          await syncTasksToSheet(
            freshToken,
            latestProject.sheetId,
            latestProject.sheetTabName || 'Tasks',
            nextTasks
          );
        }

        updateLocalProject(project.id, (p) => ({
          ...p,
          tasks: nextTasks,
          dirtyTasks: latestProject.sheetId ? false : p.dirtyTasks,
          lastSyncedAt: new Date().toISOString(),
        }));
        logActivity(
          project.title,
          'Docs',
          `Created & linked ${createdMap.size} task Google Doc(s)`
        );
        showToast(`Created ${createdMap.size} linked Google Doc(s)`);
      },
    });
  };

  // Standalone Google Doc Pages handlers
  const handleLoadExtraDoc = useCallback(
    async (project: ProjectWorkspace, doc: ProjectDocPage) => {
      if (isGuestMode) {
        if (!doc.blocks || doc.blocks.length === 0) {
          updateLocalProject(project.id, (p) => ({
            ...p,
            extraDocs: p.extraDocs.map((d) =>
              d.id === doc.id
                ? {
                    ...d,
                    blocks: buildStandaloneDocStarterBlocks(d.title, 'blank'),
                    dirty: false,
                  }
                : d
            ),
          }));
        }
        return;
      }
      const accessToken = requireToken();
      if (!accessToken) return;
      setLoadingExtraDocIds((prev) => ({ ...prev, [doc.id]: true }));
      try {
        const docData = await fetchDocBlocks(accessToken, doc.id);
        updateLocalProject(project.id, (p) => ({
          ...p,
          extraDocs: p.extraDocs.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  title: docData.docTitle,
                  url: docData.docUrl,
                  blocks:
                    docData.blocks.length > 0
                      ? docData.blocks
                      : buildStandaloneDocStarterBlocks(docData.docTitle, 'blank'),
                  dirty: false,
                }
              : d
          ),
        }));
      } catch (err) {
        handleApiError(err);
      } finally {
        setLoadingExtraDocIds((prev) => ({ ...prev, [doc.id]: false }));
      }
    },
    [handleApiError, isGuestMode, requireToken, updateLocalProject]
  );

  const executePullExtraDoc = async (project: ProjectWorkspace, doc: ProjectDocPage) => {
    await handleLoadExtraDoc(project, doc);
    showToast(
      isGuestMode
        ? `"${doc.title}" is saved locally`
        : `Pulled latest Google Doc for "${doc.title}"`
    );
  };

  const handlePullExtraDoc = async (project: ProjectWorkspace, doc: ProjectDocPage) => {
    if (isGuestMode) {
      await executePullExtraDoc(project, doc);
      return;
    }
    if (doc.dirty) {
      setPendingConfirmation({
        title: `Discard unsynced edits in "${doc.title}"?`,
        description:
          'Pulling from Google Docs will overwrite your unsynced local document edits.',
        details: [`Google Doc: ${doc.title}`],
        confirmLabel: 'Pull & Overwrite',
        danger: true,
        onConfirm: () => executePullExtraDoc(project, doc),
      });
      return;
    }
    await executePullExtraDoc(project, doc);
  };

  const handlePushExtraDoc = (project: ProjectWorkspace, doc: ProjectDocPage) => {
    if (!doc.blocks) return;
    const blocksSnapshot = doc.blocks;
    if (isGuestMode) {
      updateLocalProject(project.id, (p) => ({
        ...p,
        lastSyncedAt: new Date().toISOString(),
        extraDocs: p.extraDocs.map((d) =>
          d.id === doc.id ? { ...d, dirty: false } : d
        ),
      }));
      logActivity(project.title, 'Docs', `Saved doc page "${doc.title}" locally`);
      showToast(`Saved "${doc.title}" to local storage`);
      return;
    }

    setPendingConfirmation({
      title: `Save "${doc.title}" to Google Docs?`,
      description:
        'This will update the linked Google Doc body with the blocks you edited in Folio.',
      details: [
        `Google Doc: "${doc.title}"`,
        `Blocks to write: ${blocksSnapshot.length} structured block(s)`,
      ],
      confirmLabel: 'Save to Google Doc',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        setSyncingExtraDocIds((prev) => ({ ...prev, [doc.id]: true }));
        try {
          await syncBlocksToDoc(freshToken, doc.id, blocksSnapshot);
          updateLocalProject(project.id, (p) => ({
            ...p,
            lastSyncedAt: new Date().toISOString(),
            extraDocs: p.extraDocs.map((d) =>
              d.id === doc.id && d.blocks === blocksSnapshot
                ? { ...d, dirty: false }
                : d
            ),
          }));
          logActivity(project.title, 'Docs', `Saved doc page "${doc.title}"`);
          showToast(`Saved "${doc.title}" to Google Docs`);
        } finally {
          setSyncingExtraDocIds((prev) => ({ ...prev, [doc.id]: false }));
        }
      },
    });
  };

  const handleCreateStandaloneDoc = (
    project: ProjectWorkspace,
    title: string,
    blocks: DocBlock[]
  ) => {
    const cleanTitle = title.trim() || 'Untitled Document';
    if (isGuestMode) {
      const nowIso = new Date().toISOString();
      const createdDoc: ProjectDocPage = {
        id: uid('local_pdoc'),
        title: cleanTitle,
        url: '',
        parentDocId: null,
        modifiedTime: nowIso,
        blocks,
        dirty: false,
      };
      const newDriveItem: DriveFileItem = {
        id: createdDoc.id,
        name: createdDoc.title,
        mimeType: 'application/vnd.google-apps.document',
        modifiedTime: nowIso,
      };
      updateLocalProject(project.id, (p) => ({
        ...p,
        extraDocs: [createdDoc, ...p.extraDocs],
        driveFiles: [newDriveItem, ...p.driveFiles],
        lastSyncedAt: nowIso,
      }));
      setActiveTab('docs');
      setSelectedExtraDocId(createdDoc.id);
      logActivity(project.title, 'Docs', `Created local doc page "${createdDoc.title}"`);
      showToast(`Created document "${createdDoc.title}" locally`);
      return;
    }

    const accessToken = requireToken();
    if (!accessToken) return;

    setPendingConfirmation({
      title: `Create Google Doc "${cleanTitle}"?`,
      description:
        'This will create a new Google Doc inside your project Google Drive folder and open it for whole-screen editing.',
      details: [
        `New Google Doc: "${cleanTitle}" (${blocks.length} blocks)`,
        `Drive location: ${project.driveFolderName || 'Folio Workspace'}`,
      ],
      confirmLabel: 'Create Google Doc',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;
        const createdDoc = await createStandaloneProjectDocument(freshToken, {
          title: cleanTitle,
          projectFolderId: project.driveFolderId,
          rootFolderId: rootFolder?.id || null,
          blocks,
        });
        const newDriveItem: DriveFileItem = {
          id: createdDoc.id,
          name: createdDoc.title,
          mimeType: 'application/vnd.google-apps.document',
          webViewLink: createdDoc.url,
          modifiedTime: createdDoc.modifiedTime,
        };
        updateLocalProject(project.id, (p) => ({
          ...p,
          extraDocs: [createdDoc, ...p.extraDocs],
          driveFiles: [newDriveItem, ...p.driveFiles],
          lastSyncedAt: new Date().toISOString(),
        }));
        setActiveTab('docs');
        setSelectedExtraDocId(createdDoc.id);
        logActivity(project.title, 'Docs', `Created doc page "${createdDoc.title}"`);
        showToast(`Created Google Doc "${createdDoc.title}"`);
      },
    });
  };

  // Nested Notion-style Sub-Page inside any Document (Project Brief, Standalone Doc, or Task Doc)
  const handleCreateSubPage = (
    project: ProjectWorkspace,
    parentTarget:
      | { kind: 'brief' }
      | { kind: 'extraDoc'; docId: string }
      | { kind: 'task'; taskId: string },
    parentDocId: string,
    parentTitle: string,
    title: string,
    replaceBlockId?: string
  ) => {
    const cleanTitle = title.trim() || 'Untitled Sub-page';

    const insertPageBlockHelper = (
      blocks: DocBlock[],
      pageBlock: DocBlock
    ): DocBlock[] => {
      if (replaceBlockId) {
        const idx = blocks.findIndex((b) => b.id === replaceBlockId);
        if (idx !== -1) {
          const target = blocks[idx];
          const next = [...blocks];
          if (!target.content.trim()) {
            next[idx] = pageBlock;
          } else {
            next.splice(idx + 1, 0, pageBlock);
          }
          return next;
        }
      }
      return [...blocks, pageBlock];
    };

    if (isGuestMode) {
      const nowIso = new Date().toISOString();
      const starterBlocks = buildStandaloneDocStarterBlocks(cleanTitle, 'spec');
      const createdDoc: ProjectDocPage = {
        id: uid('local_subdoc'),
        title: cleanTitle,
        url: '',
        parentDocId,
        modifiedTime: nowIso,
        blocks: starterBlocks,
        dirty: false,
      };
      const pageBlock: DocBlock = {
        id: uid('blk'),
        type: 'page',
        content: createdDoc.title,
        docId: createdDoc.id,
        docUrl: '',
      };
      const newDriveItem: DriveFileItem = {
        id: createdDoc.id,
        name: createdDoc.title,
        mimeType: 'application/vnd.google-apps.document',
        modifiedTime: nowIso,
      };

      updateLocalProject(project.id, (p) => {
        const nextExtraDocs =
          parentTarget.kind === 'extraDoc'
            ? p.extraDocs.map((d) =>
                d.id === parentTarget.docId
                  ? {
                      ...d,
                      blocks: insertPageBlockHelper(d.blocks || [], pageBlock),
                      dirty: false,
                    }
                  : d
              )
            : p.extraDocs;

        return {
          ...p,
          blocks:
            parentTarget.kind === 'brief'
              ? insertPageBlockHelper(p.blocks, pageBlock)
              : p.blocks,
          dirtyDoc: parentTarget.kind === 'brief' ? false : p.dirtyDoc,
          tasks:
            parentTarget.kind === 'task'
              ? p.tasks.map((t) =>
                  t.id === parentTarget.taskId
                    ? {
                        ...t,
                        docBlocks: insertPageBlockHelper(t.docBlocks || [], pageBlock),
                        dirtyTaskDoc: false,
                      }
                    : t
                )
              : p.tasks,
          extraDocs: [createdDoc, ...nextExtraDocs],
          driveFiles: [newDriveItem, ...p.driveFiles],
          lastSyncedAt: nowIso,
        };
      });

      setActiveTab('docs');
      setSelectedExtraDocId(createdDoc.id);
      logActivity(
        project.title,
        'Docs',
        `Created local sub-page "${createdDoc.title}" inside "${parentTitle}"`
      );
      showToast(`Created sub-page "${createdDoc.title}" locally`);
      return;
    }

    const accessToken = requireToken();
    if (!accessToken) return;

    setPendingConfirmation({
      title: `Create sub-page "${cleanTitle}" inside "${parentTitle}"?`,
      description:
        'This will create a new nested Google Doc in your project Drive folder, embed a clickable Notion page link inside the parent document, and open the new page whole-screen.',
      details: [
        `New Sub-Page: "${cleanTitle}"`,
        `Parent Document: "${parentTitle}"`,
        `Drive location: ${project.driveFolderName || 'Folio Workspace'}`,
      ],
      confirmLabel: 'Create & Open Sub-Page',
      onConfirm: async () => {
        const freshToken = requireToken();
        if (!freshToken) return;

        const starterBlocks = buildStandaloneDocStarterBlocks(cleanTitle, 'spec');
        const createdDoc = await createStandaloneProjectDocument(freshToken, {
          title: cleanTitle,
          projectFolderId: project.driveFolderId,
          rootFolderId: rootFolder?.id || null,
          blocks: starterBlocks,
          parentDocId,
        });

        const pageBlock: DocBlock = {
          id: uid('blk'),
          type: 'page',
          content: createdDoc.title,
          docId: createdDoc.id,
          docUrl: createdDoc.url,
        };

        const insertPageBlock = (blocks: DocBlock[]): DocBlock[] =>
          insertPageBlockHelper(blocks, pageBlock);

        const latestProject =
          projectsRef.current.find((p) => p.id === project.id) || project;

        let updatedParentBlocks: DocBlock[] = [];
        if (parentTarget.kind === 'brief') {
          updatedParentBlocks = insertPageBlock(latestProject.blocks);
        } else if (parentTarget.kind === 'extraDoc') {
          const parentDoc = latestProject.extraDocs.find(
            (d) => d.id === parentTarget.docId
          );
          updatedParentBlocks = insertPageBlock(parentDoc?.blocks || []);
        } else {
          const parentTask = latestProject.tasks.find(
            (t) => t.id === parentTarget.taskId
          );
          updatedParentBlocks = insertPageBlock(parentTask?.docBlocks || []);
        }

        await syncBlocksToDoc(freshToken, parentDocId, updatedParentBlocks);

        const newDriveItem: DriveFileItem = {
          id: createdDoc.id,
          name: createdDoc.title,
          mimeType: 'application/vnd.google-apps.document',
          webViewLink: createdDoc.url,
          modifiedTime: createdDoc.modifiedTime,
        };

        updateLocalProject(project.id, (p) => {
          const nextExtraDocs =
            parentTarget.kind === 'extraDoc'
              ? p.extraDocs.map((d) =>
                  d.id === parentTarget.docId
                    ? { ...d, blocks: insertPageBlock(d.blocks || []), dirty: false }
                    : d
                )
              : p.extraDocs;

          return {
            ...p,
            blocks:
              parentTarget.kind === 'brief'
                ? insertPageBlock(p.blocks)
                : p.blocks,
            dirtyDoc: parentTarget.kind === 'brief' ? false : p.dirtyDoc,
            tasks:
              parentTarget.kind === 'task'
                ? p.tasks.map((t) =>
                    t.id === parentTarget.taskId
                      ? {
                          ...t,
                          docBlocks: insertPageBlock(t.docBlocks || []),
                          dirtyTaskDoc: false,
                        }
                      : t
                  )
                : p.tasks,
            extraDocs: [createdDoc, ...nextExtraDocs],
            driveFiles: [newDriveItem, ...p.driveFiles],
            lastSyncedAt: new Date().toISOString(),
          };
        });

        setActiveTab('docs');
        setSelectedExtraDocId(createdDoc.id);
        logActivity(
          project.title,
          'Docs',
          `Created sub-page "${createdDoc.title}" inside "${parentTitle}"`
        );
        showToast(`Created sub-page "${createdDoc.title}"`);
      },
    });
  };

  const handleOpenSubPage = (project: ProjectWorkspace, docId: string) => {
    if (project.docId === docId) {
      setSelectedExtraDocId(null);
      setActiveTab('page');
      return;
    }
    const matchingTask = project.tasks.find((t) => t.docId === docId);
    if (matchingTask) {
      setSelectedExtraDocId(null);
      setRequestedTaskId(matchingTask.id);
      setActiveTab('board');
      return;
    }
    const matchingExtra = project.extraDocs.find((d) => d.id === docId);
    if (matchingExtra) {
      setActiveTab('docs');
      setSelectedExtraDocId(matchingExtra.id);
      return;
    }
    showToast('Linked page was not found in this project. Try Pull to refresh.');
  };

  // Import existing Drive folder, Sheet, or Doc as a project (or link into current project/task)
  const handleImportOrLinkFile = async (
    file: DriveFileItem,
    mode: 'import-project' | 'link-to-project' | 'link-to-task' | 'link-extra-doc',
    targetTaskId?: string
  ) => {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    const isSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
    const isDoc = file.mimeType === 'application/vnd.google-apps.document';

    if (isGuestMode) {
      if (mode === 'link-extra-doc' && activeProject && isDoc) {
        const docPage: ProjectDocPage = {
          id: file.id,
          title: file.name,
          url: file.webViewLink || '',
          blocks: buildStandaloneDocStarterBlocks(file.name, 'blank'),
          dirty: false,
          modifiedTime: file.modifiedTime,
        };
        updateLocalProject(activeProject.id, (p) => ({
          ...p,
          extraDocs: p.extraDocs.some((d) => d.id === file.id)
            ? p.extraDocs.map((d) => (d.id === file.id ? docPage : d))
            : [docPage, ...p.extraDocs],
        }));
        setActiveTab('docs');
        setSelectedExtraDocId(file.id);
        showToast(`Linked local document "${file.name}"`);
        return;
      }

      if (mode === 'link-to-task' && activeProject && targetTaskId && isDoc) {
        updateLocalProject(activeProject.id, (p) => ({
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === targetTaskId
              ? {
                  ...t,
                  docId: file.id,
                  docTitle: file.name,
                  docUrl: file.webViewLink || '',
                  docBlocks:
                    t.docBlocks && t.docBlocks.length > 0
                      ? t.docBlocks
                      : buildStandaloneDocStarterBlocks(file.name, 'blank'),
                  dirtyTaskDoc: false,
                }
              : t
          ),
        }));
        showToast(`Linked local document "${file.name}" to task`);
        return;
      }

      const existing = projects.find(
        (p) =>
          p.id === file.id ||
          p.driveFolderId === file.id ||
          p.sheetId === file.id ||
          p.docId === file.id ||
          p.driveFiles.some((df) => df.id === file.id)
      );
      if (existing) {
        setActiveProjectId(existing.id);
        setActiveArea('project');
        showToast(`Opened "${existing.title}"`);
        return;
      }

      const matchingStandalone = standalonePages.find((pg) => pg.id === file.id);
      if (matchingStandalone) {
        setActiveStandalonePageId(matchingStandalone.id);
        setActiveArea('standalone-page');
        showToast(`Opened "${matchingStandalone.title}"`);
        return;
      }

      const created = createLocalWorkspaceProject(
        file.name,
        isFolder ? '📁' : isSheet ? '📊' : '📝',
        projects.length
      );
      setProjects((prev) => [created, ...prev]);
      setActiveProjectId(created.id);
      setActiveArea('project');
      showToast(`Opened "${file.name}" as a local project`);
      return;
    }

    const accessToken = requireToken();
    if (!accessToken) return;

    if (mode === 'link-extra-doc' && activeProject && isDoc) {
      const docData = await fetchDocBlocks(accessToken, file.id);
      const docPage: ProjectDocPage = {
        id: file.id,
        title: docData.docTitle,
        url: docData.docUrl,
        blocks:
          docData.blocks.length > 0
            ? docData.blocks
            : buildStandaloneDocStarterBlocks(docData.docTitle, 'blank'),
        dirty: false,
        modifiedTime: file.modifiedTime,
      };
      updateLocalProject(activeProject.id, (p) => ({
        ...p,
        extraDocs: p.extraDocs.some((d) => d.id === file.id)
          ? p.extraDocs.map((d) => (d.id === file.id ? docPage : d))
          : [docPage, ...p.extraDocs],
      }));
      setActiveTab('docs');
      setSelectedExtraDocId(file.id);
      logActivity(
        activeProject.title,
        'Docs',
        `Added Google Doc "${docData.docTitle}"`
      );
      showToast(`Added "${docData.docTitle}" to Documents`);
      return;
    }

    if (mode === 'link-to-task' && activeProject && targetTaskId && isDoc) {
      const docData = await fetchDocBlocks(accessToken, file.id);
      updateLocalProject(activeProject.id, (p) => ({
        ...p,
        dirtyTasks: true,
        tasks: p.tasks.map((t) =>
          t.id === targetTaskId
            ? {
                ...t,
                docId: file.id,
                docTitle: docData.docTitle,
                docUrl: docData.docUrl,
                docBlocks:
                  docData.blocks.length > 0
                    ? docData.blocks
                    : [{ id: uid('blk'), type: 'paragraph', content: '' }],
                dirtyTaskDoc: false,
              }
            : t
        ),
      }));
      logActivity(
        activeProject.title,
        'Docs',
        `Linked Doc "${docData.docTitle}" to task`
      );
      showToast(`Linked Doc "${docData.docTitle}" to task`);
      return;
    }

    if (mode === 'link-to-project' && activeProject) {
      if (isSheet) {
        const sheetData = await fetchSheetTasks(accessToken, file.id);
        updateLocalProject(activeProject.id, (p) => ({
          ...p,
          sheetId: file.id,
          sheetTitle: sheetData.sheetTitle,
          sheetTabName: sheetData.sheetTabName,
          sheetUrl: sheetData.sheetUrl,
          tasks: sheetData.tasks,
          dirtyTasks: false,
          lastSyncedAt: new Date().toISOString(),
        }));
        logActivity(
          activeProject.title,
          'Sheets',
          `Connected Sheet "${sheetData.sheetTitle}"`
        );
        showToast(`Linked Sheet "${sheetData.sheetTitle}"`);
      } else if (isDoc) {
        const docData = await fetchDocBlocks(accessToken, file.id);
        updateLocalProject(activeProject.id, (p) => ({
          ...p,
          docId: file.id,
          docTitle: docData.docTitle,
          docUrl: docData.docUrl,
          blocks:
            docData.blocks.length > 0
              ? docData.blocks
              : [{ id: uid('blk'), type: 'paragraph', content: '' }],
          dirtyDoc: false,
          lastSyncedAt: new Date().toISOString(),
        }));
        logActivity(
          activeProject.title,
          'Docs',
          `Connected Doc "${docData.docTitle}"`
        );
        showToast(`Linked Doc "${docData.docTitle}"`);
      }
      return;
    }

    // Import as new Folio project view
    const existing = projects.find(
      (p) => p.driveFolderId === file.id || p.sheetId === file.id || p.docId === file.id
    );
    if (existing) {
      setActiveProjectId(existing.id);
      setActiveArea('project');
      showToast(`Opened "${existing.title}"`);
      return;
    }

    const preset = getCoverPresetByIndex(projects.length);

    if (isFolder) {
      const files = await listFolderFiles(accessToken, file.id);
      const sheetFile = files.find(
        (f) => f.mimeType === 'application/vnd.google-apps.spreadsheet'
      );
      const candidateDocs = files.filter(
        (f) =>
          f.mimeType === 'application/vnd.google-apps.document' &&
          f.appProperties?.folioTaskDoc !== 'true'
      );
      const docFile =
        candidateDocs.find(
          (f) =>
            f.appProperties?.folioProjectBrief === 'true' ||
            f.name.endsWith('— Brief')
        ) || candidateDocs[0];
      const extraDocs: ProjectDocPage[] = candidateDocs
        .filter((f) => f.id !== docFile?.id)
        .map((f) => ({
          id: f.id,
          title: f.name,
          url: f.webViewLink || `https://docs.google.com/document/d/${f.id}/edit`,
          parentDocId: f.appProperties?.folioParentDocId || null,
          modifiedTime: f.modifiedTime,
          dirty: false,
        }));
      const sheetData = sheetFile
        ? await fetchSheetTasks(accessToken, sheetFile.id)
        : null;
      const docData = docFile
        ? await fetchDocBlocks(accessToken, docFile.id)
        : null;

      const imported: ProjectWorkspace = {
        id: file.id,
        title: file.name,
        icon: '📁',
        coverUrl: preset.url,
        driveFolderId: file.id,
        driveFolderName: file.name,
        driveFolderUrl:
          file.webViewLink || `https://drive.google.com/drive/folders/${file.id}`,
        sheetId: sheetFile?.id || null,
        sheetTitle: sheetData?.sheetTitle || sheetFile?.name || null,
        sheetTabName: sheetData?.sheetTabName || null,
        sheetUrl: sheetData?.sheetUrl || sheetFile?.webViewLink || null,
        docId: docFile?.id || null,
        docTitle: docData?.docTitle || docFile?.name || null,
        docUrl: docData?.docUrl || docFile?.webViewLink || null,
        blocks:
          docData && docData.blocks.length > 0
            ? docData.blocks
            : [{ id: uid('blk'), type: 'h1', content: file.name }],
        extraDocs,
        tasks: sheetData ? sheetData.tasks : [],
        driveFiles: files,
        lastSyncedAt: new Date().toISOString(),
        dirtyDoc: false,
        dirtyTasks: false,
      };
      setProjects((prev) => [imported, ...prev]);
      setActiveProjectId(imported.id);
      setActiveArea('project');
      setActiveTab('page');
      logActivity(file.name, 'Drive', 'Imported Drive folder as project');
      showToast(`Imported folder "${file.name}"`);
    } else if (isSheet) {
      const sheetData = await fetchSheetTasks(accessToken, file.id);
      const imported: ProjectWorkspace = {
        id: `sheet_${file.id}`,
        title: sheetData.sheetTitle,
        icon: '📊',
        coverUrl: preset.url,
        driveFolderId: null,
        driveFolderName: null,
        driveFolderUrl: null,
        sheetId: file.id,
        sheetTitle: sheetData.sheetTitle,
        sheetTabName: sheetData.sheetTabName,
        sheetUrl: sheetData.sheetUrl,
        docId: null,
        docTitle: null,
        docUrl: null,
        blocks: [
          { id: uid('blk'), type: 'h1', content: sheetData.sheetTitle },
          {
            id: uid('blk'),
            type: 'paragraph',
            content: 'Imported directly from Google Sheets. Link a Google Doc to sync long-form notes.',
          },
        ],
        extraDocs: [],
        tasks: sheetData.tasks,
        driveFiles: [file],
        lastSyncedAt: new Date().toISOString(),
        dirtyDoc: false,
        dirtyTasks: false,
      };
      setProjects((prev) => [imported, ...prev]);
      setActiveProjectId(imported.id);
      setActiveArea('project');
      setActiveTab('board');
      logActivity(sheetData.sheetTitle, 'Sheets', 'Imported Google Sheet as Task Board');
      showToast(`Imported Sheet "${sheetData.sheetTitle}"`);
    } else if (isDoc) {
      const docData = await fetchDocBlocks(accessToken, file.id);
      const imported: ProjectWorkspace = {
        id: `doc_${file.id}`,
        title: docData.docTitle,
        icon: '📝',
        coverUrl: preset.url,
        driveFolderId: null,
        driveFolderName: null,
        driveFolderUrl: null,
        sheetId: null,
        sheetTitle: null,
        sheetTabName: null,
        sheetUrl: null,
        docId: file.id,
        docTitle: docData.docTitle,
        docUrl: docData.docUrl,
        blocks:
          docData.blocks.length > 0
            ? docData.blocks
            : [{ id: uid('blk'), type: 'h1', content: docData.docTitle }],
        extraDocs: [],
        tasks: [],
        driveFiles: [file],
        lastSyncedAt: new Date().toISOString(),
        dirtyDoc: false,
        dirtyTasks: false,
      };
      setProjects((prev) => [imported, ...prev]);
      setActiveProjectId(imported.id);
      setActiveArea('project');
      setActiveTab('page');
      logActivity(docData.docTitle, 'Docs', 'Imported Google Doc as Folio page');
      showToast(`Imported Doc "${docData.docTitle}"`);
    }
  };

  const allLocalFiles = useMemo<DriveFileItem[]>(() => {
    const map = new Map<string, DriveFileItem>();
    for (const p of projects) {
      if (p.driveFolderId) {
        map.set(p.driveFolderId, {
          id: p.driveFolderId,
          name: p.driveFolderName || p.title,
          mimeType: 'application/vnd.google-apps.folder',
          modifiedTime: p.lastSyncedAt || new Date().toISOString(),
        });
      }
      for (const f of p.driveFiles) {
        map.set(f.id, f);
      }
    }
    for (const pg of standalonePages) {
      map.set(pg.id, {
        id: pg.id,
        name: pg.title,
        mimeType: 'application/vnd.google-apps.document',
        modifiedTime: pg.modifiedTime || pg.lastSyncedAt || new Date().toISOString(),
      });
    }
    return Array.from(map.values());
  }, [projects, standalonePages]);

  const handleExportLocalBackup = useCallback(() => {
    exportGuestWorkspaceToFile({
      projects,
      standalonePages,
      folderGroups,
    });
    showToast('Downloaded local workspace backup (.json)');
  }, [projects, standalonePages, folderGroups, showToast]);

  if (needsAuth || !user) {
    return (
      <AuthScreen
        onSignIn={handleLogin}
        onGuestSignIn={handleGuestLogin}
        isSigningIn={isSigningIn}
        errorMessage={authError}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />
    );
  }

  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);
  const completedTasks = projects.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.status === 'Done').length,
    0
  );
  const unsyncedProjects = projects.filter((p) => hasProjectDirty(p)).length;

  const viewKey =
    activeArea === 'project'
      ? `project-${activeProjectId || 'none'}`
      : activeArea === 'folder-group'
      ? `folder-${activeGroupId || 'none'}`
      : activeArea === 'standalone-page'
      ? `page-${activeStandalonePageId || 'none'}`
      : activeArea;

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-screen overflow-hidden bg-white text-[#191918] dark:bg-[#191918] dark:text-[#EDEDEC]">
      <NotionSidebar
        user={user}
        isGuestMode={isGuestMode}
        projects={projects}
        folderGroups={folderGroups}
        standalonePages={standalonePages}
        activeArea={activeArea}
        activeProjectId={activeProjectId}
        activeGroupId={activeGroupId}
        activeStandalonePageId={activeStandalonePageId}
        activeTab={activeTab}
        isOpen={sidebarOpen}
        darkMode={darkMode}
        onToggleSidebar={() => setSidebarOpen(false)}
        onToggleDark={() => setDarkMode((d) => !d)}
        onOpenCommandPalette={() => setCommandOpen(true)}
        onSelectArea={(area) => setActiveArea(area)}
        onSelectProject={(projectId, tab = 'page') => {
          setActiveProjectId(projectId);
          setActiveArea('project');
          setActiveTab(tab);
          setSelectedExtraDocId(null);
        }}
        onSelectFolderGroup={(groupId) => {
          setActiveGroupId(groupId);
          setActiveArea('folder-group');
        }}
        onSelectStandalonePage={(pageId) => {
          setActiveStandalonePageId(pageId);
          setActiveArea('standalone-page');
        }}
        onCreateProject={(defaultGroupId = null) => {
          setPendingProjectGroupId(defaultGroupId);
          setNewProjectOpen(true);
        }}
        onCreateFolderGroup={handleCreateFolderGroup}
        onDeleteFolderGroup={handleDeleteFolderGroup}
        onAssignProjectToGroup={handleAssignProjectToGroup}
        onCreateStandalonePage={() =>
          handleCreateWorkspaceStandalonePage(null, 'Untitled Page')
        }
        onAddStandalonePageToProject={handleAddStandalonePageToProject}
        onRemoveProjectFromWorkspace={handleRemoveProjectFromWorkspace}
        onDeleteProjectPermanently={handleDeleteProjectPermanently}
        onRemoveStandalonePageFromWorkspace={
          handleRemoveStandalonePageFromWorkspace
        }
        onDeleteStandalonePagePermanently={
          handleDeleteStandalonePagePermanently
        }
        onImportFromDrive={() =>
          setLinkModalState({ open: true, mode: 'import-project' })
        }
        onConnectGoogle={handleLogin}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Breadcrumb & Primary Action Header */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800 lg:px-6">
          <div className="flex min-w-0 items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <AnimatePresence initial={false}>
              {!sidebarOpen && (
                <motion.button
                  key="expand-sidebar"
                  type="button"
                  initial={{ opacity: 0, scale: 0.9, x: -6 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -6 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setActiveArea('overview')}
              className="font-medium text-neutral-800 hover:underline dark:text-neutral-200 whitespace-nowrap shrink-0"
            >
              Folio
            </button>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
              /
            </span>
            {activeArea === 'overview' && (
              <span className="truncate text-neutral-700 dark:text-neutral-300">
                Home & Overview
              </span>
            )}
            {activeArea === 'daily-planner' && (
              <span className="truncate text-neutral-700 dark:text-neutral-300">
                Daily Tasks, Habits & Notes
              </span>
            )}
            {activeArea === 'folder-group' && activeFolderGroup && (
              <span className="flex items-center gap-1.5 truncate font-medium text-neutral-900 dark:text-neutral-100">
                <span>{activeFolderGroup.icon}</span>
                <span className="truncate">{activeFolderGroup.name}</span>
                <span className="text-neutral-400 font-normal">· Gallery</span>
              </span>
            )}
            {activeArea === 'standalone-page' && activeStandalonePage && (
              <span className="flex items-center gap-1.5 truncate font-medium text-neutral-900 dark:text-neutral-100">
                <span>{activeStandalonePage.icon}</span>
                <span className="truncate">{activeStandalonePage.title}</span>
              </span>
            )}
            {activeArea === 'sync-hub' && (
              <span className="truncate text-neutral-700 dark:text-neutral-300">
                Workspace Sync Hub
              </span>
            )}
            {activeArea === 'drive-browser' && (
              <span className="truncate text-neutral-700 dark:text-neutral-300">
                Google Drive Files
              </span>
            )}
            {activeArea === 'project' && activeProject && (
              <>
                {activeProject.groupId &&
                  (() => {
                    const grp = folderGroups.find(
                      (g) => g.id === activeProject.groupId
                    );
                    if (!grp) return null;
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveGroupId(grp.id);
                            setActiveArea('folder-group');
                          }}
                          className="flex items-center gap-1 text-neutral-600 hover:underline dark:text-neutral-400 whitespace-nowrap shrink-0"
                        >
                          <span>{grp.icon}</span>
                          <span>{grp.name}</span>
                        </button>
                        <span
                          aria-hidden="true"
                          className="text-neutral-300 dark:text-neutral-700"
                        >
                          /
                        </span>
                      </>
                    );
                  })()}
                <span className="flex items-center gap-1.5 truncate font-medium text-neutral-900 dark:text-neutral-100">
                  <span>{activeProject.icon}</span>
                  <span className="truncate">{activeProject.title}</span>
                </span>
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
                  /
                </span>
                <span className="capitalize text-neutral-500 dark:text-neutral-400 whitespace-nowrap shrink-0">
                  {activeTab === 'page'
                    ? 'Page & Brief'
                    : activeTab === 'docs'
                    ? 'Documents'
                    : activeTab}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleFullWidth}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                fullWidthCanvas
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800'
              }`}
              title={
                fullWidthCanvas
                  ? 'Switch to standard page width'
                  : 'Expand canvas width from edge to edge'
              }
            >
              {fullWidthCanvas ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Standard Width</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Full Width</span>
                </>
              )}
            </button>

            {activeArea === 'project' && activeProject ? (
              syncingIds[activeProject.id] ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing...</span>
                </span>
              ) : hasProjectDirty(activeProject) ? (
                autoSyncEnabled ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
                    Auto-syncing...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePushProject(activeProject)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Sync Changes</span>
                  </button>
                )
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{autoSyncEnabled ? 'Auto-synced' : 'Synced'}</span>
                </span>
              )
            ) : (
              <button
                type="button"
                onClick={() => setNewProjectOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </header>

        <AnimatePresence initial={false}>
          {workspaceError && (
            <motion.div
              key="workspace-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-between gap-4 border-b border-red-200 bg-red-50 px-6 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            >
              <span>{workspaceError}</span>
              <button
                type="button"
                onClick={() => setWorkspaceError(null)}
                className="font-medium underline"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
          {isLoadingWorkspace ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mx-auto max-w-[1100px] space-y-6 px-6 py-10 lg:px-10"
            >
              <div className="h-7 w-56 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-[#F8F8F7] dark:border-neutral-800 dark:bg-[#20201E]"
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-52 animate-pulse rounded-xl border border-neutral-200 bg-[#F8F8F7] dark:border-neutral-800 dark:bg-[#20201E]"
                  />
                ))}
              </div>
            </motion.div>
          ) : activeArea === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={
                fullWidthCanvas
                  ? 'w-full max-w-none space-y-8 px-4 py-8 sm:px-6 transition-all duration-200'
                  : 'mx-auto max-w-[1100px] space-y-8 px-6 py-8 lg:px-10 transition-all duration-200'
              }
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Connected to {user.email}
                  </p>
                  <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    Workspace Overview
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCreateWorkspaceStandalonePage(null, 'Untitled Page')
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                  >
                    <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>+ Standalone Page</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCreateFolderGroup(
                        `Project Group ${folderGroups.length + 1}`,
                        '📁'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                  >
                    <Folder className="h-3.5 w-3.5 text-amber-600" />
                    <span>+ New Folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveArea('daily-planner')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                  >
                    <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Daily Tasks & Habits</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLinkModalState({ open: true, mode: 'import-project' })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span>Import from Drive</span>
                  </button>
                  {rootFolder && (
                    <a
                      href={rootFolder.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                    >
                      <span>Open Root Folder</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* 4-Column Metric Strip */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-neutral-200 bg-[#F8F8F7] p-4 dark:border-neutral-800 dark:bg-[#20201E]">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Active Projects
                  </div>
                  <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                    {projects.length}
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-[#F8F8F7] p-4 dark:border-neutral-800 dark:bg-[#20201E]">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Total Tasks
                  </div>
                  <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                    {totalTasks}
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-[#F8F8F7] p-4 dark:border-neutral-800 dark:bg-[#20201E]">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Completed Tasks
                  </div>
                  <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {completedTasks}
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-[#F8F8F7] p-4 dark:border-neutral-800 dark:bg-[#20201E]">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Unsynced Projects
                  </div>
                  <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                    {unsyncedProjects}
                  </div>
                </div>
              </div>

              {/* Folder Groups Section on Overview */}
              {folderGroups.length > 0 && (
                <div>
                  <div className="mb-3.5 flex items-center justify-between">
                    <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      Project Folders & Groups
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        handleCreateFolderGroup(
                          `Project Group ${folderGroups.length + 1}`,
                          '📁'
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New Folder</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {folderGroups.map((grp) => {
                      const grpProjects = projects.filter(
                        (p) => p.groupId === grp.id
                      );
                      const grpTasks = grpProjects.reduce(
                        (sum, p) => sum + p.tasks.length,
                        0
                      );
                      const grpDone = grpProjects.reduce(
                        (sum, p) =>
                          sum + p.tasks.filter((t) => t.status === 'Done').length,
                        0
                      );
                      return (
                        <button
                          key={grp.id}
                          type="button"
                          onClick={() => {
                            setActiveGroupId(grp.id);
                            setActiveArea('folder-group');
                          }}
                          className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-[#F8F8F7] p-4 text-left transition-all hover:border-neutral-300 hover:bg-white hover:shadow-xs dark:border-neutral-800 dark:bg-[#20201E] dark:hover:border-neutral-700"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2.5">
                                <span className="text-xl">{grp.icon}</span>
                                <span className="font-display text-base font-semibold text-neutral-900 group-hover:underline dark:text-neutral-100">
                                  {grp.name}
                                </span>
                              </span>
                              <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs tabular-nums text-neutral-600 dark:bg-[#191918] dark:text-neutral-300">
                                {grpProjects.length} project{grpProjects.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              {grpProjects.length === 0 ? (
                                <span className="text-xs text-neutral-400">
                                  Empty folder · Click to open gallery
                                </span>
                              ) : (
                                grpProjects.slice(0, 3).map((gp) => (
                                  <span
                                    key={gp.id}
                                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200/80 bg-white px-2 py-0.5 text-[11px] text-neutral-700 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-300"
                                  >
                                    <span>{gp.icon}</span>
                                    <span className="max-w-[110px] truncate">{gp.title}</span>
                                  </span>
                                ))
                              )}
                              {grpProjects.length > 3 && (
                                <span className="text-[11px] text-neutral-400">
                                  +{grpProjects.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-neutral-200/70 pt-2.5 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                            <span className="tabular-nums">
                              {grpDone}/{grpTasks} tasks done
                            </span>
                            <span className="font-medium text-neutral-700 group-hover:text-neutral-900 dark:text-neutral-300">
                              Open Gallery →
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Projects Grid or Empty State */}
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-[#F8F8F7] px-6 py-16 text-center dark:border-neutral-800 dark:bg-[#20201E]">
                  <FolderOpen className="h-9 w-9 text-neutral-400" />
                  <h2 className="mt-3 font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Your Folio Workspace is ready
                  </h2>
                  <p className="mt-1 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
                    Create your first project to automatically provision a Google Drive folder, a Tasks Google Sheet, and a Brief Google Doc—or import an existing Drive folder.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setNewProjectOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create First Project</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLinkModalState({ open: true, mode: 'import-project' })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      <span>Import from Google Drive</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      Projects
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveArea('sync-hub')}
                      className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                    >
                      <span>Open Sync Hub</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((p, idx) => {
                      const done = p.tasks.filter((t) => t.status === 'Done').length;
                      const fallback = getCoverPresetByIndex(idx).fallbackGradient;
                      const isMenuOpen = openOverviewMenuId === p.id;
                      const assignedFolder = p.groupId
                        ? folderGroups.find((g) => g.id === p.groupId)
                        : null;

                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: Math.min(idx * 0.04, 0.2),
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          whileHover={{ y: -2 }}
                          className="group relative flex flex-col overflow-visible rounded-xl border border-neutral-200 bg-white transition-colors hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-[#20201E] dark:hover:border-neutral-700"
                        >
                          <div
                            onClick={() => {
                              setActiveProjectId(p.id);
                              setActiveArea('project');
                              setActiveTab('page');
                            }}
                            className="h-28 w-full cursor-pointer overflow-hidden rounded-t-xl border-b border-neutral-200 dark:border-neutral-800"
                            style={{ background: fallback }}
                          >
                            {p.coverUrl && (
                              <img
                                src={p.coverUrl}
                                alt={p.title}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                              />
                            )}
                          </div>

                          {/* 3-Dot Project Action Menu on Overview Card */}
                          <div className="absolute right-2.5 top-2.5 z-20">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenOverviewMenuId(isMenuOpen ? null : p.id);
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200/80 bg-white/90 text-neutral-700 shadow-xs backdrop-blur-xs transition-colors hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200"
                              title="Project options (Add page, Move to folder, Remove, Delete)"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            <AnimatePresence>
                              {isMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                  className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-[#242422]"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenOverviewMenuId(null);
                                      handleAddStandalonePageToProject(p.id);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                  >
                                    <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                    <span>Add Standalone Page</span>
                                  </button>

                                  {folderGroups.length > 0 && (
                                    <>
                                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                                      <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                        Folder Group
                                      </div>
                                      {p.groupId && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenOverviewMenuId(null);
                                            handleAssignProjectToGroup(p.id, null);
                                          }}
                                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                        >
                                          <FolderMinus className="h-3.5 w-3.5 text-neutral-500" />
                                          <span>Remove from Folder</span>
                                        </button>
                                      )}
                                      {folderGroups
                                        .filter((g) => g.id !== p.groupId)
                                        .map((g) => (
                                          <button
                                            key={g.id}
                                            type="button"
                                            onClick={() => {
                                              setOpenOverviewMenuId(null);
                                              handleAssignProjectToGroup(p.id, g.id);
                                            }}
                                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                          >
                                            <FolderInput className="h-3.5 w-3.5 text-neutral-500" />
                                            <span className="truncate">
                                              Move to {g.icon} {g.name}
                                            </span>
                                          </button>
                                        ))}
                                    </>
                                  )}

                                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenOverviewMenuId(null);
                                      handleRemoveProjectFromWorkspace(p);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                  >
                                    <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                                    <span>Remove from Here (Keep in Drive)</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenOverviewMenuId(null);
                                      handleDeleteProjectPermanently(p);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete Permanently from Drive</span>
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="flex flex-1 flex-col justify-between p-4">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveProjectId(p.id);
                                    setActiveArea('project');
                                    setActiveTab('page');
                                  }}
                                  className="flex min-w-0 items-center gap-2 text-left"
                                >
                                  <span className="text-lg">{p.icon}</span>
                                  <h3 className="truncate font-display text-base font-semibold text-neutral-900 hover:underline dark:text-neutral-100">
                                    {p.title}
                                  </h3>
                                </button>
                                {assignedFolder && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveGroupId(assignedFolder.id);
                                      setActiveArea('folder-group');
                                    }}
                                    className="shrink-0 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                                    title={`Open folder "${assignedFolder.name}"`}
                                  >
                                    {assignedFolder.icon} {assignedFolder.name}
                                  </button>
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                <span className="tabular-nums">
                                  {done}/{p.tasks.length} tasks done
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">
                                  {p.driveFiles.length} files
                                </span>
                                {hasProjectDirty(p) && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-medium text-amber-600 dark:text-amber-400">
                                      Unsynced
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveProjectId(p.id);
                                    setActiveArea('project');
                                    setActiveTab('page');
                                  }}
                                  className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>Brief</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveProjectId(p.id);
                                    setActiveArea('project');
                                    setActiveTab('board');
                                  }}
                                  className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                                >
                                  <FileSpreadsheet className="h-3.5 w-3.5" />
                                  <span>Board</span>
                                </button>
                              </div>

                              {p.driveFolderUrl && (
                                <a
                                  href={p.driveFolderUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                                >
                                  <span>Drive</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Standalone Pages Section on Overview */}
              <div>
                <div className="mb-3.5 flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    Standalone Pages ({standalonePages.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      handleCreateWorkspaceStandalonePage(null, 'Untitled Page')
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Standalone Page</span>
                  </button>
                </div>
                {standalonePages.length === 0 ? (
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-neutral-300 bg-[#F8F8F7] px-5 py-4 dark:border-neutral-800 dark:bg-[#20201E]">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Create standalone Notion-style pages synced directly with Google Docs in your Folio Workspace folder.
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCreateWorkspaceStandalonePage(null, 'Untitled Page')
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200 shrink-0"
                    >
                      <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Create Standalone Page</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {standalonePages.map((pg) => (
                      <div
                        key={pg.id}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-[#20201E] dark:hover:border-neutral-700"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveStandalonePageId(pg.id);
                            setActiveArea('standalone-page');
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          <span className="text-lg">{pg.icon}</span>
                          <div className="min-w-0">
                            <div className="truncate font-display text-sm font-semibold text-neutral-900 group-hover:underline dark:text-neutral-100">
                              {pg.title}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {pg.blocks.length} block{pg.blocks.length === 1 ? '' : 's'} · Google Doc
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveStandalonePageFromWorkspace(pg)
                            }
                            className="rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                            title="Remove from here (keep in Drive)"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteStandalonePagePermanently(pg)
                            }
                            className="rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            title="Delete permanently from Drive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeArea === 'folder-group' && activeFolderGroup ? (
            <motion.div
              key={viewKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <FolderGalleryView
                group={activeFolderGroup}
                allGroups={folderGroups}
                projectsInGroup={projects.filter(
                  (p) => p.groupId === activeFolderGroup.id
                )}
                availableProjects={projects.filter(
                  (p) => p.groupId !== activeFolderGroup.id
                )}
                fullWidth={fullWidthCanvas}
                onRenameGroup={handleRenameFolderGroup}
                onChangeGroupIcon={handleChangeFolderGroupIcon}
                onDeleteGroup={handleDeleteFolderGroup}
                onOpenProject={(projectId, tab = 'page') => {
                  setActiveProjectId(projectId);
                  setActiveArea('project');
                  setActiveTab(tab);
                  setSelectedExtraDocId(null);
                }}
                onCreateProjectInGroup={(groupId) => {
                  setPendingProjectGroupId(groupId);
                  setNewProjectOpen(true);
                }}
                onAssignProjectToGroup={handleAssignProjectToGroup}
                onAddStandalonePageToProject={handleAddStandalonePageToProject}
                onRemoveProjectFromWorkspace={handleRemoveProjectFromWorkspace}
                onDeleteProjectPermanently={handleDeleteProjectPermanently}
                hasProjectDirty={hasProjectDirty}
              />
            </motion.div>
          ) : activeArea === 'standalone-page' && activeStandalonePage ? (
            <motion.div
              key={viewKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <StandalonePageView
                page={activeStandalonePage}
                allPages={standalonePages}
                isPulling={Boolean(pullingStandaloneIds[activeStandalonePage.id])}
                isSyncing={Boolean(syncingStandaloneIds[activeStandalonePage.id])}
                autoSyncEnabled={autoSyncEnabled}
                fullWidth={fullWidthCanvas}
                onTitleChange={(title) =>
                  setStandalonePages((prev) =>
                    prev.map((pg) =>
                      pg.id === activeStandalonePage.id
                        ? { ...pg, title, dirty: true }
                        : pg
                    )
                  )
                }
                onIconChange={(icon) =>
                  setStandalonePages((prev) =>
                    prev.map((pg) =>
                      pg.id === activeStandalonePage.id ? { ...pg, icon } : pg
                    )
                  )
                }
                onCoverChange={(coverUrl) =>
                  setStandalonePages((prev) =>
                    prev.map((pg) =>
                      pg.id === activeStandalonePage.id ? { ...pg, coverUrl } : pg
                    )
                  )
                }
                onBlocksChange={(blocks) =>
                  setStandalonePages((prev) =>
                    prev.map((pg) =>
                      pg.id === activeStandalonePage.id
                        ? { ...pg, blocks, dirty: true }
                        : pg
                    )
                  )
                }
                onPullPage={() => handlePullStandalonePage(activeStandalonePage)}
                onPushPage={() => handlePushStandalonePage(activeStandalonePage)}
                onCreateSubPage={(title, replaceBlockId) =>
                  handleCreateWorkspaceStandalonePage(
                    activeStandalonePage.id,
                    title,
                    replaceBlockId
                  )
                }
                onOpenPage={(pageId) => {
                  setActiveStandalonePageId(pageId);
                  setActiveArea('standalone-page');
                }}
                onRemoveFromWorkspace={() =>
                  handleRemoveStandalonePageFromWorkspace(activeStandalonePage)
                }
                onDeletePermanently={() =>
                  handleDeleteStandalonePagePermanently(activeStandalonePage)
                }
              />
            </motion.div>
          ) : activeArea === 'daily-planner' ? (
            <motion.div
              key="daily-planner"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <DailyPlannerView
                userId={user.uid}
                fullWidth={fullWidthCanvas}
                onToggleFullWidth={handleToggleFullWidth}
              />
            </motion.div>
          ) : activeArea === 'sync-hub' ? (
            <motion.div
              key="sync-hub"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <SyncHubView
                projects={projects}
                activityLog={activityLog}
                autoSyncEnabled={autoSyncEnabled}
                syncingIds={syncingIds}
                onToggleAutoSync={handleToggleAutoSync}
                onPullAll={handlePullAll}
                onPullProject={handlePullProject}
                onPushProject={handlePushProject}
                onOpenProject={(id) => {
                  setActiveProjectId(id);
                  setActiveArea('project');
                }}
                isPullingId={isPullingId}
              />
            </motion.div>
          ) : activeArea === 'drive-browser' ? (
            <motion.div
              key="drive-browser"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <DriveBrowserView
                token={token}
                isGuestMode={isGuestMode}
                localFiles={allLocalFiles}
                rootFolderUrl={rootFolder?.webViewLink || null}
                onImportAsProject={(file) =>
                  handleImportOrLinkFile(file, 'import-project')
                }
                onExportLocalBackup={handleExportLocalBackup}
              />
            </motion.div>
          ) : activeProject ? (
            <motion.div
              key={viewKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProjectView
                project={activeProject}
                activeTab={activeTab}
                isPulling={isPullingId === activeProject.id}
                isSyncing={Boolean(syncingIds[activeProject.id])}
                autoSyncEnabled={autoSyncEnabled}
                onToggleAutoSync={handleToggleAutoSync}
                onTabChange={setActiveTab}
                onTitleChange={(title) =>
                  updateLocalProject(activeProject.id, (p) => ({
                    ...p,
                    title,
                    dirtyDoc: true,
                  }))
                }
                onIconChange={(icon) =>
                  updateLocalProject(activeProject.id, (p) => ({ ...p, icon }))
                }
                onCoverChange={(coverUrl) =>
                  updateLocalProject(activeProject.id, (p) => ({ ...p, coverUrl }))
                }
                onBlocksChange={(blocks: DocBlock[]) =>
                  updateLocalProject(activeProject.id, (p) => ({
                    ...p,
                    blocks,
                    dirtyDoc: true,
                  }))
                }
                onTasksChange={(tasks: TaskItem[]) =>
                  updateLocalProject(activeProject.id, (p) => ({
                    ...p,
                    tasks,
                    dirtyTasks: true,
                  }))
                }
                onTaskDocBlocksChange={(taskId, blocks) =>
                  updateLocalProject(activeProject.id, (p) => ({
                    ...p,
                    tasks: p.tasks.map((t) =>
                      t.id === taskId
                        ? { ...t, docBlocks: blocks, dirtyTaskDoc: true }
                        : t
                    ),
                  }))
                }
                onCreateTaskDoc={(task, docTitle, blocks) =>
                  handleCreateTaskDoc(activeProject, task, docTitle, blocks)
                }
                onCreateMissingTaskDocs={() =>
                  handleCreateMissingTaskDocs(activeProject)
                }
                onLinkExistingTaskDoc={(task) =>
                  setLinkModalState({
                    open: true,
                    mode: 'link-to-task',
                    targetTaskId: task.id,
                    targetTaskTitle: task.title,
                  })
                }
                onLoadTaskDoc={(task) => handleLoadTaskDoc(activeProject, task)}
                onPullTaskDoc={(task) => handlePullTaskDoc(activeProject, task)}
                onPushTaskDoc={(task) => handlePushTaskDoc(activeProject, task)}
                loadingTaskDocIds={loadingTaskDocIds}
                syncingTaskDocIds={syncingTaskDocIds}
                selectedExtraDocId={selectedExtraDocId}
                onSelectExtraDocId={setSelectedExtraDocId}
                loadingExtraDocIds={loadingExtraDocIds}
                syncingExtraDocIds={syncingExtraDocIds}
                onCreateStandaloneDoc={(title, blocks) =>
                  handleCreateStandaloneDoc(activeProject, title, blocks)
                }
                onLoadExtraDoc={(doc) => handleLoadExtraDoc(activeProject, doc)}
                onPullExtraDoc={(doc) => handlePullExtraDoc(activeProject, doc)}
                onPushExtraDoc={(doc) => handlePushExtraDoc(activeProject, doc)}
                onExtraDocBlocksChange={(docId, blocks) =>
                  updateLocalProject(activeProject.id, (p) => ({
                    ...p,
                    extraDocs: p.extraDocs.map((d) =>
                      d.id === docId ? { ...d, blocks, dirty: true } : d
                    ),
                  }))
                }
                onLinkExtraDoc={() =>
                  setLinkModalState({ open: true, mode: 'link-extra-doc' })
                }
                onCreateSubPage={(
                  parentTarget,
                  parentDocId,
                  parentTitle,
                  title,
                  replaceBlockId
                ) =>
                  handleCreateSubPage(
                    activeProject,
                    parentTarget,
                    parentDocId,
                    parentTitle,
                    title,
                    replaceBlockId
                  )
                }
                onOpenSubPage={(docId) => handleOpenSubPage(activeProject, docId)}
                onBackToParent={(parentDocId) =>
                  handleOpenSubPage(activeProject, parentDocId)
                }
                requestedTaskId={requestedTaskId}
                onClearRequestedTaskId={() => setRequestedTaskId(null)}
                onRequestOpenTaskDoc={(taskId) => {
                  setRequestedTaskId(taskId);
                  setActiveTab('board');
                }}
                onPullFromWorkspace={() => handlePullProject(activeProject)}
                onPushToWorkspace={() => handlePushProject(activeProject)}
                onRefreshDriveFolder={() => handleRefreshDriveFolder(activeProject)}
                onUploadFile={(file) => handleUploadFile(activeProject, file)}
                onLinkExistingFile={() =>
                  setLinkModalState({ open: true, mode: 'link-to-project' })
                }
                onRenameFile={(file, newName) =>
                  handleRenameFile(activeProject, file, newName)
                }
                onTrashFile={(file) => handleTrashFile(activeProject, file)}
                folderGroups={folderGroups}
                onAssignProjectToGroup={(groupId) =>
                  handleAssignProjectToGroup(activeProject.id, groupId)
                }
                onRemoveProjectFromWorkspace={() =>
                  handleRemoveProjectFromWorkspace(activeProject)
                }
                onDeleteProjectPermanently={() =>
                  handleDeleteProjectPermanently(activeProject)
                }
                fullWidth={fullWidthCanvas}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty-project"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full items-center justify-center p-8 text-sm text-neutral-500"
            >
              Select a project from the sidebar or create a new one.
            </motion.div>
          )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals & Overlays */}
      <CommandPalette
        isOpen={commandOpen}
        projects={projects}
        onClose={() => setCommandOpen(false)}
        onSelectArea={(area) => setActiveArea(area)}
        onSelectProject={(projectId, tab) => {
          setActiveProjectId(projectId);
          setActiveArea('project');
          setActiveTab(tab);
        }}
      />

      <NewProjectModal
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreate={handleCreateProject}
      />

      <LinkWorkspaceModal
        isOpen={linkModalState.open}
        mode={linkModalState.mode}
        taskTitle={linkModalState.targetTaskTitle}
        token={token}
        isGuestMode={isGuestMode}
        localFiles={allLocalFiles}
        onClose={() => setLinkModalState((prev) => ({ ...prev, open: false }))}
        onSelectFile={(file) =>
          handleImportOrLinkFile(
            file,
            linkModalState.mode,
            linkModalState.targetTaskId
          )
        }
      />

      <ConfirmModal
        confirmation={pendingConfirmation}
        onClose={() => setPendingConfirmation(null)}
      />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 z-50 rounded-lg border border-neutral-200 bg-neutral-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg dark:border-neutral-700 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
