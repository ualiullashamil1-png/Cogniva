/** Логотип Cogniva. Файл лежит в public/cogniva-logo.png (прозрачный фон). Пропорции не меняются. */
export function Logo({ height = 40 }: { height?: number }) {
  return <img className="cg-logo" src="/cogniva-logo.png" alt="Cogniva" style={{ ["--logo-h" as string]: `${height}px` }} draggable={false} />;
}