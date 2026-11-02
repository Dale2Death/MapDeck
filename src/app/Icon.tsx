import { icon } from "../player/icons";

/** Interface icon as a React element. */
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <span className="ico" dangerouslySetInnerHTML={{ __html: icon(name, size) }} />;
}
