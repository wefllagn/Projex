import { unifiedDiffLines } from './unified-diff.js'

export function GroupDiff({ patch }) {
  return <div className="group-diff"><p className="group-help">Diff key: + added · − removed · neutral context</p><pre aria-label="Commit diff">{unifiedDiffLines(patch).map((line, index) => <span key={index} className={`group-diff-line group-diff-line--${line.kind}`}>{line.text}</span>)}</pre></div>
}
