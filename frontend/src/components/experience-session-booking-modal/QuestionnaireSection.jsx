import React from 'react';

const QuestionnaireSection = ({ title, questions, answers, onChange }) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3" data-testid="questionnaire-section">
      {title ? (
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      ) : null}
      {questions.map((question) => {
        const key = question.questionKey;
        const currentValue = answers[key] ?? '';
        const isBoolean = question.type === 'boolean';

        if (isBoolean) {
          return (
            <label
              key={key}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={currentValue === 'true' || currentValue === true}
                onChange={(event) => onChange(key, event.target.checked ? 'true' : 'false')}
                className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
              />
              <span className="text-sm text-slate-700">
                {question.prompt}
                {question.required ? (
                  <span className="text-red-500 ml-1">*</span>
                ) : null}
              </span>
            </label>
          );
        }

        return (
          <div key={key}>
            <label className="block text-sm text-slate-700 mb-1">
              {question.prompt}
              {question.required ? (
                <span className="text-red-500 ml-1">*</span>
              ) : null}
            </label>
            <input
              type="text"
              value={currentValue}
              onChange={(event) => onChange(key, event.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="Your answer"
            />
          </div>
        );
      })}
    </div>
  );
};

export default QuestionnaireSection;
