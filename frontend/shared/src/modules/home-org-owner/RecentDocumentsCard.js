import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FileSpreadsheet, FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
const EXT_ICON = {
    PDF: { Icon: FileText, tone: 'bg-danger-soft text-danger' },
    XLSX: { Icon: FileSpreadsheet, tone: 'bg-success-soft text-success' },
    CSV: { Icon: FileSpreadsheet, tone: 'bg-info-soft text-info' },
    PNG: { Icon: ImageIcon, tone: 'bg-lavender-soft text-lavender' },
};
export function RecentDocumentsCard({ documents }) {
    return (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-3 p-5", children: [_jsx("h3", { className: "font-display text-base font-semibold text-ink", children: "Recent Documents" }), _jsxs("ul", { className: "grid grid-cols-2 gap-2 @2xl:grid-cols-3 @5xl:grid-cols-6", children: [documents.map((document) => {
                        const { Icon, tone } = EXT_ICON[document.ext];
                        return (_jsx("li", { children: _jsxs("button", { type: "button", className: "flex w-full items-center gap-3 rounded-2xl bg-white/70 p-3 text-left ring-1 ring-white/70 hover:bg-white", children: [_jsx("span", { className: cn('grid size-9 shrink-0 place-items-center rounded-xl', tone), children: _jsx(Icon, { className: "size-[16px]" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[12.5px] font-semibold text-ink", children: document.name }), _jsxs("p", { className: "truncate text-[11px] text-ink-muted", children: [document.ext, " \u00B7 ", document.size, " \u00B7 ", document.when] })] })] }) }, document.id));
                    }), _jsx("li", { children: _jsxs("button", { type: "button", className: "flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand/40 bg-white/40 p-3 text-left text-brand hover:bg-white/70", children: [_jsx("span", { className: "grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand", children: _jsx(Upload, { className: "size-[16px]" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[12.5px] font-semibold", children: "Upload Document" }), _jsxs("p", { className: "text-[11px] font-medium text-ink-muted", children: ["Drag & drop or ", _jsx("span", { className: "underline", children: "browse" })] })] })] }) })] })] }));
}
