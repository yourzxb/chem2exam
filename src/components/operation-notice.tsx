export type OperationNoticeTone = "info" | "working" | "success" | "error";

interface OperationNoticeProps {
  message: string;
  busy?: boolean;
}

export function OperationNotice({ message, busy = false }: OperationNoticeProps) {
  const tone = busy ? "working" : getNoticeTone(message);

  return (
    <div className={`operation-notice operation-notice-${tone}`} role="status" aria-live="polite">
      <span className="operation-notice-dot" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function getNoticeTone(message: string): OperationNoticeTone {
  if (/失败|错误|不匹配|没有权限|请先|不能|无效|不存在|超时|重试/.test(message)) return "error";
  if (/正在|处理中|读取中|保存中|刷新中|生成中|提交中|执行中|导入中|检索中/.test(message)) return "working";
  if (/已|成功|完成|进入|生成|保存|更新|创建|读取|导入|发布|通过|刷新/.test(message)) return "success";
  return "info";
}
