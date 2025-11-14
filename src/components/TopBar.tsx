// [EARS: PROJ-001, PROJ-006, PROJ-008, PROJ-009, EXP-007] Top bar with project controls and export

import { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Exporter, type ExportTrack } from '../audio/exporter';

export function TopBar() {
  const {
    currentProject,
    tracks,
    updateProject,
    createProject,
    loadProject,
    deleteProject,
    getAllProjects,
  } = useProjectStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; createdAt: number; updatedAt: number }>>([]);

  /**
   * Handle New Project button click
   * [EARS: PROJ-001] Create new project with name prompt
   */
  const handleNewProject = async () => {
    const name = window.prompt('Project name:', 'Untitled Project');
    await createProject(name || 'Untitled Project');
  };

  /**
   * Handle Load button click
   * [EARS: PROJ-006] Show project list modal
   */
  const handleLoadClick = async () => {
    const allProjects = await getAllProjects();
    setProjects(allProjects);
    setShowLoadModal(true);
  };

  /**
   * Handle project selection from modal
   * [EARS: PROJ-006] Load selected project
   */
  const handleLoadProject = async (projectId: string) => {
    await loadProject(projectId);
    setShowLoadModal(false);
  };

  /**
   * Handle Delete Project button click
   * [EARS: PROJ-008] Delete project with confirmation
   */
  const handleDeleteProject = async () => {
    if (!currentProject) return;

    const confirmed = window.confirm(`Delete "${currentProject.name}"? This cannot be undone.`);
    if (confirmed) {
      await deleteProject(currentProject.id);
    }
  };

  /**
   * Start editing project name
   * [EARS: PROJ-009] Edit project name on click
   */
  const startEditingName = () => {
    if (!currentProject) return;
    setEditedName(currentProject.name);
    setIsEditingName(true);
  };

  /**
   * Save project name
   * [EARS: PROJ-009] Save project name on blur or Enter
   */
  const saveProjectName = async () => {
    if (!currentProject || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    await updateProject(currentProject.id, { name: editedName.trim() });
    setIsEditingName(false);
  };

  /**
   * Handle keyboard events in name input
   * [EARS: PROJ-009] Save on Enter
   */
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveProjectName();
    }
  };

  /**
   * Export project to WAV
   * [EARS: EXP-003, EXP-007] Download WAV file
   */
  const handleExportWAV = async () => {
    if (!currentProject || tracks.length === 0) return;

    const audioContext = new AudioContext();
    const exporter = new Exporter(audioContext);

    const exportTracks: ExportTrack[] = tracks.map(track => ({
      id: track.id,
      audioBlob: track.audioBlob,
      volume: track.volume,
      muted: track.muted,
      soloed: track.soloed,
    }));

    await exporter.downloadWAV(exportTracks, currentProject.name);
    exporter.dispose();
    audioContext.close();
    setShowExportDropdown(false);
  };

  /**
   * Export project to MP3
   * [EARS: EXP-006, EXP-007] Download MP3 file
   */
  const handleExportMP3 = async () => {
    if (!currentProject || tracks.length === 0) return;

    const audioContext = new AudioContext();
    const exporter = new Exporter(audioContext);

    const exportTracks: ExportTrack[] = tracks.map(track => ({
      id: track.id,
      audioBlob: track.audioBlob,
      volume: track.volume,
      muted: track.muted,
      soloed: track.soloed,
    }));

    await exporter.downloadMP3(exportTracks, currentProject.name);
    exporter.dispose();
    audioContext.close();
    setShowExportDropdown(false);
  };

  return (
    <div className="top-bar" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      backgroundColor: '#2c2c2c',
      borderBottom: '2px solid #444',
    }}>
      {/* Project Name */}
      <div className="project-name" style={{ flex: 1 }}>
        {isEditingName ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={saveProjectName}
            onKeyDown={handleNameKeyDown}
            autoFocus
            style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              background: '#444',
              color: '#fff',
              border: '1px solid #666',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
            }}
          />
        ) : (
          <h1
            onClick={startEditingName}
            style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: currentProject ? '#fff' : '#888',
              cursor: currentProject ? 'pointer' : 'default',
              margin: 0,
            }}
          >
            {currentProject ? currentProject.name : 'No Project Loaded'}
          </h1>
        )}
      </div>

      {/* New Project Button */}
      <button
        onClick={handleNewProject}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#4caf50',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        New Project
      </button>

      {/* Load Button */}
      <button
        onClick={handleLoadClick}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#2196f3',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        Load
      </button>

      {/* Export Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowExportDropdown(!showExportDropdown)}
          disabled={!currentProject || tracks.length === 0}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: (!currentProject || tracks.length === 0) ? '#666' : '#ff9800',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: (!currentProject || tracks.length === 0) ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          Export ▼
        </button>

        {showExportDropdown && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              backgroundColor: '#444',
              border: '1px solid #666',
              borderRadius: '4px',
              overflow: 'hidden',
              zIndex: 1000,
            }}
          >
            <button
              onClick={handleExportWAV}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#555'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Export as WAV
            </button>
            <button
              onClick={handleExportMP3}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#555'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Export as MP3
            </button>
          </div>
        )}
      </div>

      {/* Delete Project Button */}
      <button
        onClick={handleDeleteProject}
        disabled={!currentProject}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: !currentProject ? '#666' : '#f44336',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: !currentProject ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        Delete Project
      </button>

      {/* Load Project Modal */}
      {showLoadModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowLoadModal(false)}
        >
          <div
            style={{
              backgroundColor: '#2c2c2c',
              border: '2px solid #444',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '500px',
              maxHeight: '70vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, color: '#fff' }}>Load Project</h2>
            {projects.length === 0 ? (
              <p style={{ color: '#888' }}>No projects found</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleLoadProject(project.id)}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#444',
                      color: '#fff',
                      border: '1px solid #666',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#555'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#444'}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowLoadModal(false)}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#666',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
