(() => {
  const eligible = /^\/(?:$|my(?:\/|$)|course\/view\.php$)/.test(location.pathname);
  const signedIn = document.querySelector('#user-menu-toggle, .usermenu [data-toggle="dropdown"]');
  if (eligible && signedIn) globalThis.__folioSync(false).catch(() => {});
})();
