import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AgoraView } from '@/features/platform-agora/components/agora-view';
import {
  AGORA_PLATFORM_IDS,
  agoraConfigs,
  isAgoraPlatformId
} from '@/features/platform-agora/data/agora-configs';

interface PageProps {
  params: Promise<{ platformId: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return AGORA_PLATFORM_IDS.map((platformId) => ({ platformId }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { platformId } = await params;
  if (!isAgoraPlatformId(platformId)) return {};
  return { title: `Dashboard : ${agoraConfigs[platformId].name} Agora` };
}

export default async function Page({ params }: PageProps) {
  const { platformId } = await params;
  if (!isAgoraPlatformId(platformId)) notFound();
  return <AgoraView platformId={platformId} />;
}
