export type BreadcrumbsProps = {
  homeLabel?: string;
  showHome?: boolean;
  transformLabel?: (segment: string) => string;
  rootPath?: string;
  className?: string;
  separator?: string | React.ReactNode;
  activeLinkClass?: string;
  inactiveLinkClass?: string;
};
