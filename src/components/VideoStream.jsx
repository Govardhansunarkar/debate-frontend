import { JitsiMeeting } from '@jitsi/react-sdk';
import { useRef, useEffect } from 'react';

export default function VideoStream({ debateId, userId, playerName, isAIDebate = false }) {
  const jitsiApiRef = useRef(null);

  // If it's an AI debate, we don't need Jitsi (AI uses local speech recognition)
  if (isAIDebate) {
    return (
      <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 border-2 border-purple-500/30 shadow-2xl flex flex-col items-center justify-center aspect-video w-full h-[500px]">
        <div className="text-7xl mb-4 animate-pulse drop-shadow-2xl">🤖</div>
        <h3 className="text-xl font-black text-white tracking-widest uppercase">AI Arena Pro</h3>
        <div className="mt-4 flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-full border border-purple-500/40">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></span>
          <span className="text-purple-200 text-xs font-bold uppercase tracking-tighter">Analyzing Argument</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] w-full bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700 relative">
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={`SkillForceAI_Debate_${debateId}`}
        configOverwrite={{
          startWithAudioMuted: false,
          disableModeratorIndicator: true,
          startScreenSharing: false,
          enableEmailInStats: false,
          prejoinPageEnabled: false,
          enableNoisyMicDetection: true,
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
