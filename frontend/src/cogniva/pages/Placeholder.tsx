import { EmptyState } from "../../design";

/** Временная страница: заменяется настоящей на следующих шагах. */
export default function Placeholder({ title, text }: { title: string; text: string }) {
  return <EmptyState icon="🛠" title={title} description={text} />;
}