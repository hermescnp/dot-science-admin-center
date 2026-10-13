import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  siteIntroLines,
  sitePlatformAccent,
  sitePlatforms,
  siteSlideImage,
  siteSlideOrder,
  siteWorkspace,
  type SitePlatform,
  type SiteSlideKind
} from '../data/site-content';

const BRAND_SURFACE = 'bg-[#0a1727] text-white';

export function SiteOverview() {
  return (
    <div className='flex flex-col gap-6'>
      <WorkspaceIntro />
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {sitePlatforms.map((platform) => (
          <PlatformColumn key={platform.id} platform={platform} />
        ))}
      </div>
    </div>
  );
}

function WorkspaceIntro() {
  return (
    <Card className={`${BRAND_SURFACE} overflow-hidden border-white/10 p-0`}>
      <div className='relative grid gap-8 p-6 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'>
        <div
          aria-hidden
          className='pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-[#68DBFF]/15 blur-3xl'
        />
        <div className='relative flex flex-col items-start gap-5'>
          <Image
            src={siteWorkspace.logo}
            alt={siteWorkspace.name}
            width={394}
            height={196}
            className='h-auto w-64 md:w-80'
            unoptimized
          />
          <div className='space-y-1'>
            <p className='text-xs tracking-[0.2em] text-[#68DBFF] uppercase'>
              {siteWorkspace.concept}
            </p>
            <h2 className='text-2xl font-semibold'>{siteWorkspace.name}</h2>
            <p className='text-white/70'>{siteWorkspace.vision}</p>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <ColorSwatches colors={siteWorkspace.colors} />
            <SiteLink url={siteWorkspace.url} />
          </div>
        </div>
        <div className='relative flex flex-col justify-center gap-6'>
          <div>
            <p className='mb-3 text-xs tracking-[0.2em] text-white/50 uppercase'>Intro</p>
            <ol className='space-y-1.5 text-lg leading-snug font-light md:text-xl'>
              {siteIntroLines.map((line, index) => (
                <li
                  key={line}
                  className={index === siteIntroLines.length - 1 ? 'text-[#68DBFF]' : undefined}
                >
                  {line}
                </li>
              ))}
            </ol>
          </div>
          <dl className='grid gap-3 text-sm sm:grid-cols-3'>
            <OriginStatement label='Opening' value={siteWorkspace.origin.openingStatement} />
            <OriginStatement label='Branching' value={siteWorkspace.origin.branchStatement} />
            <OriginStatement label='Prompt' value={siteWorkspace.origin.selectionPrompt} />
          </dl>
        </div>
      </div>
    </Card>
  );
}

function OriginStatement({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border border-white/10 bg-white/5 p-3'>
      <dt className='mb-1 text-[0.65rem] tracking-[0.18em] text-white/50 uppercase'>{label}</dt>
      <dd className='text-white/85'>{value}</dd>
    </div>
  );
}

function PlatformColumn({ platform }: { platform: SitePlatform }) {
  const accent = sitePlatformAccent(platform);
  return (
    <section
      className='flex min-w-0 flex-col gap-3'
      style={{ '--accent': accent } as CSSProperties}
    >
      <Card className={`${BRAND_SURFACE} gap-4 overflow-hidden border-white/10`}>
        <CardHeader className='flex flex-col items-center gap-3 text-center'>
          <div className='flex h-24 items-center'>
            <Image
              src={platform.logo}
              alt={platform.name}
              width={96}
              height={96}
              className='h-24 w-auto'
              unoptimized
            />
          </div>
          <div className='space-y-1'>
            <h3 className='text-lg font-semibold'>{platform.name}</h3>
            <p className='text-sm text-[var(--accent)]'>{platform.concept}</p>
            <p className='text-sm text-white/70 italic'>“{platform.vision}”</p>
          </div>
        </CardHeader>
        <CardContent className='flex flex-wrap items-center justify-center gap-3'>
          <Badge variant='outline' className='border-[var(--accent)]/50 text-[var(--accent)]'>
            {platform.state}
          </Badge>
          <ColorSwatches colors={platform.colors} />
          <SiteLink url={platform.url} />
        </CardContent>
      </Card>
      {siteSlideOrder.map((slide) => (
        <SlideCard
          key={slide.kind}
          platform={platform}
          kind={slide.kind}
          eyebrow={`${slide.index}. ${slide.eyebrow}`}
        />
      ))}
    </section>
  );
}

function SlideCard({
  platform,
  kind,
  eyebrow
}: {
  platform: SitePlatform;
  kind: SiteSlideKind;
  eyebrow: string;
}) {
  return (
    <Card className='gap-0 overflow-hidden p-0'>
      <div className='relative aspect-video bg-[#0a1727]'>
        <Image
          src={siteSlideImage(platform.id, kind)}
          alt={`${platform.name}: ${eyebrow}`}
          fill
          sizes='(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw'
          className='object-cover'
        />
      </div>
      <div className='space-y-3 p-4 text-sm'>
        <p className='text-[0.65rem] font-medium tracking-[0.18em] text-[var(--accent)] uppercase'>
          {eyebrow}
        </p>
        <SlideBody platform={platform} kind={kind} />
      </div>
    </Card>
  );
}

function SlideBody({ platform, kind }: { platform: SitePlatform; kind: SiteSlideKind }) {
  switch (kind) {
    case 'identity':
      return (
        <>
          <SlideTitle>{platform.concept}</SlideTitle>
          <Field label='Human problem' value={platform.firstSlide.humanProblem} />
          <Field label='New perspective' value={platform.firstSlide.newPerspective} />
        </>
      );
    case 'experience':
      return (
        <>
          <SlideTitle>{platform.secondSlide.title}</SlideTitle>
          <Field label='Story' value={platform.secondSlide.story} />
          <Field label='Feeling' value={platform.secondSlide.feeling} />
        </>
      );
    case 'transformation':
      return (
        <>
          <SlideTitle>{platform.thirdSlide.title}</SlideTitle>
          <Field label='Before' value={platform.thirdSlide.before} />
          <Field label='Through' value={platform.thirdSlide.through} />
          <Field label='After' value={platform.thirdSlide.after} />
        </>
      );
    case 'capabilities':
      return (
        <>
          <SlideTitle>{platform.fourthSlide.title}</SlideTitle>
          <ul className='space-y-2'>
            {platform.fourthSlide.environments.map((environment) => (
              <li key={environment.name}>
                <span className='font-medium'>{environment.name}</span>
                <span className='text-muted-foreground'> · {environment.summary}</span>
              </li>
            ))}
          </ul>
          <Field label='Workspace connection' value={platform.fourthSlide.workspaceConnection} />
        </>
      );
  }
}

function SlideTitle({ children }: { children: ReactNode }) {
  return <h4 className='text-base leading-snug font-semibold'>{children}</h4>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-muted-foreground mb-0.5 text-xs font-medium'>{label}</p>
      <p className='leading-relaxed'>{value}</p>
    </div>
  );
}

function ColorSwatches({ colors }: { colors: readonly string[] }) {
  return (
    <div className='flex items-center gap-1'>
      {colors.map((color) => (
        <span
          key={color}
          title={color}
          className='size-4 rounded-full border border-white/30'
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function SiteLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target='_blank'
      rel='noreferrer'
      className='inline-flex items-center gap-1 text-xs text-white/70 hover:text-white'
    >
      {new URL(url).host}
      <Icons.externalLink className='size-3' />
    </a>
  );
}
