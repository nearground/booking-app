import React from 'react';

/**
 * Sidebar navigation for organizer profile sections.
 * @param {Object} props
 * @param {string[]} props.sections - Section names.
 * @param {string} props.activeSection - Currently selected section.
 * @param {function} props.onSelectSection - Callback for section selection.
 */
const Sidebar = ({ sections, activeSection, onSelectSection }) => {
  return (
    <nav className="w-56 min-w-[180px] flex-col gap-2 hidden md:flex">
      {sections.map((section) => (
        <button
          key={section}
          className={`text-left px-3 py-2 rounded font-medium transition-colors ${
            activeSection === section
              ? 'bg-brand text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-200'
          }`}
          onClick={() => onSelectSection(section)}
        >
          {section}
        </button>
      ))}
    </nav>
  );
};

export default Sidebar;
