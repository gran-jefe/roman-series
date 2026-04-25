export const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
    <div className="h-8 bg-gray-200 rounded w-24" />
  </div>
);

export const StatCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
    <div className="h-8 bg-gray-200 rounded w-16" />
  </div>
);

export const TableRowSkeleton = () => (
  <tr className="border-b animate-pulse">
    <td className="px-6 py-3">
      <div className="h-4 bg-gray-200 rounded w-32" />
    </td>
    <td className="px-6 py-3">
      <div className="h-4 bg-gray-200 rounded w-24" />
    </td>
    <td className="px-6 py-3">
      <div className="h-4 bg-gray-200 rounded w-20" />
    </td>
    <td className="px-6 py-3">
      <div className="h-4 bg-gray-200 rounded w-16" />
    </td>
  </tr>
);

export const QuestionSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
    <div className="space-y-3 mb-4">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
    <div className="space-y-2 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 bg-gray-100 rounded-lg" />
      ))}
    </div>
    <div className="flex gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-1 h-10 bg-gray-200 rounded-lg" />
      ))}
    </div>
  </div>
);

export const UniversitySkeleton = () => (
  <div className="rounded-lg p-6 bg-gray-200 animate-pulse h-32" />
);

export const SubjectSkeleton = () => (
  <div className="rounded-lg p-6 bg-gray-200 animate-pulse h-24" />
);

export const SessionRowSkeleton = () => (
  <tr className="border-b animate-pulse">
    <td className="px-6 py-3">
      <div className="h-4 bg-gray-200 rounded w-24" />
    </td>
    <td className="px-6 py-3">
      <div className="h-4 bg-gray-200 rounded w-32" />
    </td>
    <td className="px-6 py-3">
      <div className="h-4 bg-gray-200 rounded w-20" />
    </td>
    <td className="px-6 py-3">
      <div className="h-6 bg-gray-200 rounded w-12" />
    </td>
    <td className="px-6 py-3">
      <div className="h-4 bg-gray-200 rounded w-20" />
    </td>
  </tr>
);
