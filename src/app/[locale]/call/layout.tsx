interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  // The call room is always dark, whatever the app theme.
  return (
    <div className="dark h-svh bg-stage text-stage-foreground">{children}</div>
  );
};

export default Layout;
