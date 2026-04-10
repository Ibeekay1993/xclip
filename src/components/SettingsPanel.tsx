import { useState } from "react";
import { Settings, X, Youtube, Link2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GlassCard } from "./GlassCard";
import { useToast } from "@/hooks/use-toast";

// Platform icons as simple components
const TwitchIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const KickIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M1.2 0h21.6v24H1.2V0zm10.8 18.15V5.85H9.6v4.39L6.98 6.23H4.2l4.09 5.77L4.2 17.77h2.78l2.62-4.02v4.4h2.4zm4.51-1.71c.6 0 1.13-.11 1.58-.33.46-.22.81-.53 1.07-.93.25-.4.38-.86.38-1.38s-.13-.98-.38-1.38a2.52 2.52 0 00-1.07-.93 3.47 3.47 0 00-1.58-.33c-.6 0-1.13.11-1.58.33-.46.22-.81.53-1.07.93-.25.4-.38.86-.38 1.38s.13.98.38 1.38c.26.4.61.71 1.07.93.45.22.98.33 1.58.33z"/>
  </svg>
);

interface PlatformConnection {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  connected: boolean;
  username?: string;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([
    { id: "youtube", name: "YouTube", icon: <Youtube className="w-5 h-5" />, color: "text-red-500", connected: false },
    { id: "tiktok", name: "TikTok", icon: <TikTokIcon />, color: "text-pink-500", connected: false },
    { id: "twitch", name: "Twitch", icon: <TwitchIcon />, color: "text-purple-500", connected: false },
    { id: "kick", name: "Kick", icon: <KickIcon />, color: "text-green-500", connected: false },
  ]);

  const [apiKeys, setApiKeys] = useState({
    youtube: "",
    tiktok: "",
  });

  const handleConnect = (platformId: string) => {
    setPlatforms(prev => 
      prev.map(p => 
        p.id === platformId 
          ? { ...p, connected: true, username: `@clipforge_${platformId}` }
          : p
      )
    );
    toast({
      title: "Connected!",
      description: `Successfully connected to ${platforms.find(p => p.id === platformId)?.name}`,
    });
  };

  const handleDisconnect = (platformId: string) => {
    setPlatforms(prev => 
      prev.map(p => 
        p.id === platformId 
          ? { ...p, connected: false, username: undefined }
          : p
      )
    );
    toast({
      title: "Disconnected",
      description: `Disconnected from ${platforms.find(p => p.id === platformId)?.name}`,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <GlassCard className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-y-auto" gradient>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Platform Connections */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-secondary" />
            Platform Connections
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your accounts to import videos and export clips directly.
          </p>
          
          <div className="space-y-3">
            {platforms.map((platform) => (
              <div 
                key={platform.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className={platform.color}>{platform.icon}</div>
                  <div>
                    <p className="font-medium">{platform.name}</p>
                    {platform.connected && platform.username && (
                      <p className="text-sm text-muted-foreground">{platform.username}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {platform.connected ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <Button variant="outline" size="sm" onClick={() => handleDisconnect(platform.id)}>
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button variant="gradient" size="sm" onClick={() => handleConnect(platform.id)}>
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Settings */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Export Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Default Aspect Ratio</label>
              <div className="flex gap-2">
                {["9:16 (Vertical)", "16:9 (Horizontal)", "1:1 (Square)"].map((ratio) => (
                  <Button key={ratio} variant="outline" size="sm" className="flex-1">
                    {ratio}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Default Quality</label>
              <div className="flex gap-2">
                {["720p", "1080p", "4K"].map((quality) => (
                  <Button key={quality} variant={quality === "1080p" ? "gradient" : "outline"} size="sm" className="flex-1">
                    {quality}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-primary">Pro Tip</p>
              <p className="text-sm text-muted-foreground mt-1">
                For best results, use videos under 2 hours. The AI works best with clear audio and 
                well-structured content like podcasts, interviews, or gaming streams.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
