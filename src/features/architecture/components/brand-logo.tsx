import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  logo: string;
  logoDark?: string;
  size: number;
  className?: string;
}

export function BrandLogo({ logo, logoDark, size, className }: BrandLogoProps) {
  return (
    <>
      <Image
        src={logo}
        alt=''
        width={size}
        height={size}
        unoptimized
        className={cn('shrink-0 object-contain', logoDark && 'dark:hidden', className)}
        style={{ width: size, height: size }}
      />
      {logoDark ? (
        <Image
          src={logoDark}
          alt=''
          width={size}
          height={size}
          unoptimized
          className={cn('hidden shrink-0 object-contain dark:block', className)}
          style={{ width: size, height: size }}
        />
      ) : null}
    </>
  );
}
