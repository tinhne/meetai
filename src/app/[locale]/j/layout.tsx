interface Props {
  children: React.ReactNode;
}

// Join pages share the always-dark call room look.
const Layout = ({ children }: Props) => {
  return (
    <div className="dark min-h-svh bg-stage text-stage-foreground">{children}</div>
  );
};

export default Layout;
