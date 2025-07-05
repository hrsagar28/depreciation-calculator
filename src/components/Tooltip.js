import React from 'react';

const Tooltip = ({ text, children, id }) => (
    <div className="relative flex items-center group">
        {React.cloneElement(children, { 'aria-describedby': id })}
        <div
            id={id}
            role="tooltip"
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-slate-800 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 pointer-events-none z-20 shadow-lg"
        >
            {text}
            <svg className="absolute text-slate-800 h-2 w-full left-0 bottom-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,255 127.5,127.5 255,255"/></svg>
        </div>
    </div>
);

export default Tooltip;