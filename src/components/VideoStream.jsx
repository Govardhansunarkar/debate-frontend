import { JitsiMeeting } from '@jitsi/react-sdk';
import { useRef, useEffect } from 'react';
import { FiCpu } from 'react-icons/fi';

export default function VideoStream({ debateId, userId, playerName, isAIDebate = false }) {
  const jitsiApiRef = useRef(null);

  // If it's an AI debate, we don't need Jitsi (AI uses local speech recognition)
  if (isAIDebate) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg flex flex-col items-center justify-center aspect-video w-full h-[500px]">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800 text-sky-400">
          <FiCpu className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-semibold text-white">AI debate room</h3>
        <p className="mt-2 text-sm text-slate-400 text-center max-w-xs">
          Waiting for the AI speech and analysis flow to begin.
        </p>
        <div className="mt-5 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"></span>
          <span className="text-slate-300 text-xs font-medium uppercase tracking-wide">Ready to analyze</span>
        </div>
      </div>
    );
  }

  const uniqueRoomId = debateId ? debateId.toString().toLowerCase().replace(/[^a-z0-h0-9]/g, '') : Math.random().toString(36).substring(7);
  const roomName = `SkillForceAIDebate_${uniqueRoomId}`;

  return (
    <div className="flex flex-col h-[600px] w-full bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700 relative">
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: false,
          disableModeratorIndicator: true,
          startScreenSharing: false,
          enableEmailInStats: false,
          prejoinPageEnabled: false,
          enableNoisyMicDetection: true,
          subject: 'Skill Force AI Debate',
          toolbarButtons: [
             'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
             'fodeviceselection', 'hangup', 'profile', 'chat', 'settings', 'raisehand',
             'videoquality', 'filmstrip', 'tileview', 'videobackgroundblur'
          ],
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          SHOW_JITSI_WATERMARK: false,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Debater',
        }}
        userInfo={{
          displayName: playerName || 'User',
        }}
        onApiReady={(externalApi) => {
          jitsiApiRef.current = externalApi;
          console.log('✅ Jitsi Meet API is ready');
          
          externalApi.addEventListener('videoConferenceLeft', () => {
             window.location.href = '/';
          });
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '100%';
          iframeRef.style.width = '100%';
        }}
      />
    </div>
  );
}
