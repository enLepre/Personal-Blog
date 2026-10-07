export function aboutSections() {
  return (tree) => {
    const visit = (node) => {
      if (node.children) {
        const grouped = [];
        let section;
        for (const child of node.children) {
          if (child.type === 'element' && child.tagName === 'h2') {
            section = { type: 'element', tagName: 'section', properties: { className: ['item'] }, children: [child] };
            grouped.push(section);
          } else if (section) section.children.push(child);
          else grouped.push(child);
        }
        // Only group root Markdown blocks; leave nested content untouched.
        if (node.type === 'root') node.children = grouped;
      }
    };
    visit(tree);
  };
}
