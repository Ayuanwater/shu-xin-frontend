import React, { useState } from 'react';
import { AppStep, UserState, ProblemCategory, DecisionCard, DecisionResponse } from './types';
import BigButton from './components/BigButton';
import DecisionCardView from './components/DecisionCardView';

/**
 * 舒心助手（Frontend）
 * - 不使用任何前端模型 SDK
 * - 不引用 Vite 模板 logo / css
 * - 只通过 fetch 调用后端 API
 */

// ✅ 你的后端 API（已部署）
const API_BASE = 'https://shu-xin-api-clean-laln.vercel.app';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [userState, setUserState] = useState<UserState>('');
  const [category, setCategory] = useState<ProblemCategory>('');
  const [problemText, setProblemText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<DecisionCard[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const resetAll = () => {
    setStep(AppStep.WELCOME);
    setUserState('');
    setCategory('');
    setProblemText('');
    setResults([]);
  };

  const handleDecision = async () => {
    if (!problemText.trim()) return;

    setStep(AppStep.LOADING);
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${API_BASE}/api/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text: problemText,
          context: {
            state: userState,
            category,
            language: 'zh',
            mode: 'text',
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: DecisionResponse = await response.json();

      if (data && Array.isArray(data.cards)) {
        setResults(data.cards);
        setStep(AppStep.RESULT);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(err);

      setResults([
        {
          title: '我听到的是',
          content: `您刚才说：“${problemText}”。我明白您现在感觉 ${userState}。`,
        },
        {
          title: '先让事情慢下来',
          content:
            '网络或系统有点忙，我们可以先不急着决定。喝口水，深呼吸一下。',
        },
        {
          title: '换个方式再试一次',
          content:
            '如果方便，可以补充一句：现在最让你担心的点是什么？然后再点一次“帮我捋一捋”。',
        },
      ]);

      setStep(AppStep.RESULT);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case AppStep.WELCOME:
        return (
          <div className="flex flex-col items-center text-center space-y-8">
            <h1 className="text-4xl font-bold text-slate-800">舒心助手</h1>
            <p className="text-xl text-slate-500">
              不替你做决定，只陪你把事情捋清楚
            </p>
            <BigButton onClick={() => setStep(AppStep.SELECT_STATE)}>
              开始捋一捋
            </BigButton>
          </div>
        );

      case AppStep.SELECT_STATE:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">现在的状态</h2>
            {(['我有点慌', '我不知道该怎么选', '钱的事让我压力很大', '我想慢慢想，不急'] as UserState[]).map(
              (s) => (
                <BigButton
                  key={s}
                  variant="outline"
                  onClick={() => {
                    setUserState(s);
                    setStep(AppStep.SELECT_CATEGORY);
                  }}
                >
                  {s}
                </BigButton>
              )
            )}
          </div>
        );

      case AppStep.SELECT_CATEGORY:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">事情分类</h2>
            {(['账单/欠费', '吃饭/出行/日常花销', '工作/时间安排', '其他/说不清'] as ProblemCategory[]).map(
              (c) => (
                <BigButton
                  key={c}
                  variant="outline"
                  onClick={() => {
                    setCategory(c);
                    setStep(AppStep.INPUT_PROBLEM);
                  }}
                >
                  {c}
                </BigButton>
              )
            )}
          </div>
        );

      case AppStep.INPUT_PROBLEM:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">发生了什么事？</h2>
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="在这里写下你担心的事情…"
              className="w-full h-40 p-4 border rounded-xl"
            />
            <BigButton onClick={handleDecision} disabled={isLoading || !problemText.trim()}>
              帮我捋一捋
            </BigButton>
          </div>
        );

      case AppStep.LOADING:
        return (
          <div className="text-center space-y-4">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-lg text-slate-500">我在帮你把事情理顺…</p>
          </div>
        );

      case AppStep.RESULT:
        return (
          <div className="space-y-6">
            {results.map((card, i) => (
              <DecisionCardView key={i} card={card} />
            ))}
            <BigButton onClick={() => setStep(AppStep.INPUT_PROBLEM)}>
              再捋一次
            </BigButton>
            <BigButton variant="outline" onClick={resetAll}>
              从头开始
            </BigButton>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen max-w-lg mx-auto p-6 bg-slate-50">
      {renderStep()}

      <div className="mt-12 text-center">
        <button
          onClick={() => setShowHelp(true)}
          className="text-slate-400 underline"
        >
          紧急帮助
        </button>
      </div>

      {showHelp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6">
          <div className="bg-white p-6 rounded-xl">
            <p className="text-lg">
              如果你感到非常不安全，请立即联系当地的紧急求助电话或身边的人。
            </p>
            <BigButton onClick={() => setShowHelp(false)}>
              我知道了
            </BigButton>
          </div>
        </div>
      )}
    </main>
  );
};

export default App;