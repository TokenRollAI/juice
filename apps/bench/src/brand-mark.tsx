import type { SVGProps } from 'react';

export function JuiceMark({
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 2H21A9 9 0 0 1 30 11V21A9 9 0 0 1 21 30H11A9 9 0 0 1 2 21V11A9 9 0 0 1 11 2ZM12.2 9.2A2.6 2.6 0 1 0 12.2 14.4A2.6 2.6 0 1 0 12.2 9.2ZM20.5 8.5A2.25 2.25 0 0 0 18.25 10.75V17.75A2.75 2.75 0 0 1 15.5 20.5H12A2.25 2.25 0 0 0 12 25H15.5A7.25 7.25 0 0 0 22.75 17.75V10.75A2.25 2.25 0 0 0 20.5 8.5Z"
      />
    </svg>
  );
}
