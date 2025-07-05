'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, ArrowRight } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string[];
  quiz?: {
    question: string;
    options: string[];
    correct: number;
  };
  completed: boolean;
}

interface MusicTheoryProps {
  isActive: boolean;
}

export default function MusicTheory({ isActive }: MusicTheoryProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const lessons: Lesson[] = [
    {
      id: 'basics-1',
      title: '🎹 Piano Basics',
      description: 'Learn the fundamentals of Pink Poong Piano',
      content: [
        'Welcome to Pink Poong Piano! Our game features 15 piano keys arranged in two rows.',
        'Top row (Keys 1-8): C4, C#4, D4, D#4, E4, F4, F#4, G4',
        'Bottom row (Keys 9-15): G#4, A4, A#4, B4, C5, C#5, D5',
        'Each key produces a different musical note when pressed',
        'The keys follow the standard piano layout with both white and black keys',
        'C4 (key 1) is middle C - the most important reference note in music'
      ],
      quiz: {
        question: 'How many total keys does Pink Poong Piano have?',
        options: ['8 keys', '12 keys', '15 keys', '88 keys'],
        correct: 2
      },
      completed: false
    },
    {
      id: 'game-basics',
      title: '🎮 How to Play',
      description: 'Master the falling tiles game mechanics',
      content: [
        'Pink Poong Piano is a rhythm game where tiles fall from the top of the screen.',
        'Your goal is to press the correct piano key when the tile reaches the pink hit zone.',
        'Perfect timing gives you the highest score and builds your combo multiplier.',
        'Hit accuracy levels: PERFECT (90%+), GREAT (70%+), GOOD (50%+), OK (below 50%)',
        'Missing tiles breaks your combo and reduces your overall accuracy.',
        'Watch the game stats: Score, Combo, Accuracy, and Song Progress are displayed during play.',
        'Use keyboard shortcuts: Space (pause), Ctrl+R (restart), Ctrl+S (song selection), Esc (close dialogs)'
      ],
      quiz: {
        question: 'What happens when you achieve perfect timing?',
        options: ['You get more points', 'Your combo increases', 'Both of the above', 'Nothing special'],
        correct: 2
      },
      completed: false
    },
    {
      id: 'song-manager-1',
      title: '🎵 Song Manager Overview',
      description: 'Understanding the Song Manager interface',
      content: [
        'The Song Manager is where you create, edit, and organize your musical compositions.',
        'Main features: Song List, Note Editor, Playback Controls, and Export/Import tools.',
        'Songs are automatically saved to your browser\'s local storage.',
        'Each song has properties: Name, BPM (beats per minute), Duration, and Notes.',
        'The interface shows song statistics: total notes, duration, and creation date.',
        'You can duplicate existing songs to create variations.',
        'Songs created here can be played in the Piano Game mode.'
      ],
      quiz: {
        question: 'Where are your songs stored?',
        options: ['On a server', 'In browser local storage', 'In the cloud', 'On your hard drive'],
        correct: 1
      },
      completed: false
    },
    {
      id: 'song-manager-2',
      title: '✏️ Creating Your First Song',
      description: 'Step-by-step guide to song creation',
      content: [
        'Step 1: Click "Create New Song" button in Song Manager.',
        'Step 2: Enter a catchy song name (e.g., "My First Melody").',
        'Step 3: Set the BPM (beats per minute). Start with 120 BPM for beginners.',
        'Step 4: Use the note editor to place notes on the timeline.',
        'Step 5: Click on any time position to add a note for that timing.',
        'Step 6: Select which key (1-15) should be pressed at that time.',
        'Step 7: Adjust note duration and velocity (volume) if needed.',
        'Step 8: Use the playback controls to test your creation.',
        'Step 9: Save your song when you\'re satisfied with the result.'
      ],
      quiz: {
        question: 'What is the recommended BPM for beginners?',
        options: ['80 BPM', '100 BPM', '120 BPM', '160 BPM'],
        correct: 2
      },
      completed: false
    },
    {
      id: 'song-manager-3',
      title: '🎼 Advanced Song Editing',
      description: 'Master the note editor and timing',
      content: [
        'The timeline shows beats and measures for precise note placement.',
        'Snap-to-grid feature helps align notes to exact beat positions.',
        'You can drag notes to different positions or keys after placing them.',
        'Note properties: Start Time, Duration, Key Number, and Velocity.',
        'Velocity affects how loud/soft the note sounds (1-127 range).',
        'Copy and paste notes to quickly create repeating patterns.',
        'Use the zoom controls to work on detailed timing or see the full song.',
        'The metronome helps you maintain consistent tempo while editing.',
        'Preview mode lets you hear how your song sounds before saving.'
      ],
      quiz: {
        question: 'What does note velocity control?',
        options: ['Note speed', 'Note volume', 'Note duration', 'Note pitch'],
        correct: 1
      },
      completed: false
    },
    {
      id: 'rhythm-1',
      title: '⏱️ Understanding Rhythm and Timing',
      description: 'Master beats, tempo, and musical timing',
      content: [
        'Music is organized in beats - steady pulses like a heartbeat.',
        'A measure typically contains 4 beats in most popular music.',
        'BPM (Beats Per Minute) determines how fast or slow the music feels.',
        'Common BPM ranges: Slow ballad (60-80), Pop song (120-140), Dance music (128-140).',
        'In Pink Poong Piano, timing is crucial for high scores.',
        'The falling tiles help you visualize rhythm and note timing.',
        'Practice counting: 1, 2, 3, 4 while playing to internalize the beat.',
        'Subdivision: Each beat can be divided into smaller parts (8th notes, 16th notes).'
      ],
      quiz: {
        question: 'How many beats are typically in one measure of popular music?',
        options: ['2', '3', '4', '8'],
        correct: 2
      },
      completed: false
    },
    {
      id: 'import-export',
      title: '💾 Import and Export',
      description: 'Share your songs and use external content',
      content: [
        'Export your songs as JSON files to share with friends.',
        'Import songs created by other players or downloaded from the community.',
        'The export function creates a file with all song data: notes, timing, and metadata.',
        'When importing, the song is automatically added to your Song Manager.',
        'Exported files are small and can be shared via email, messaging, or file sharing.',
        'Always backup your favorite songs by exporting them regularly.',
        'You can also duplicate songs within the Song Manager to create variations.',
        'Imported songs appear in your song list immediately after import.'
      ],
      quiz: {
        question: 'What format are songs exported as?',
        options: ['MP3 files', 'MIDI files', 'JSON files', 'Text files'],
        correct: 2
      },
      completed: false
    },
    {
      id: 'audio-analyzer',
      title: '🎤 Audio Analyzer Features',
      description: 'Use real audio input to play the piano',
      content: [
        'The Audio Analyzer can detect musical notes from your microphone.',
        'Sing, hum, or play a real instrument to trigger piano keys automatically.',
        'Features: Real-time pitch detection, note confidence levels, and recording.',
        'Adjust sensitivity to match your voice or instrument volume.',
        'The waveform visualization shows your audio input in real-time.',
        'Frequency spectrum display helps you understand audio characteristics.',
        'Recording feature lets you capture and export your performances.',
        'Note detection works best with clear, single-note sounds.',
        'Perfect for musicians who want to compose by ear or improvise.'
      ],
      quiz: {
        question: 'What can trigger the piano keys in Audio Analyzer mode?',
        options: ['Only singing', 'Only instruments', 'Any audio input', 'Only piano sounds'],
        correct: 2
      },
      completed: false
    },
    {
      id: 'tips-tricks',
      title: '💡 Tips and Tricks',
      description: 'Pro strategies for better gameplay and composition',
      content: [
        'Start with simple songs and gradually increase complexity.',
        'Practice mode: Use slow BPM songs to build muscle memory.',
        'Focus on accuracy first, then work on speed and complex patterns.',
        'Use the keyboard shortcuts to quickly restart or change songs during practice.',
        'Study the falling tile patterns before starting a difficult song.',
        'Create warm-up exercises with repetitive patterns.',
        'Export your best songs to share achievements with friends.',
        'Use the Audio Analyzer to experiment with melody ideas.',
        'Pay attention to the hit zone - perfect timing is key to high scores.',
        'Take breaks to avoid finger fatigue during long practice sessions.'
      ],
      quiz: {
        question: 'What should beginners focus on first?',
        options: ['Speed', 'Accuracy', 'Complex songs', 'High scores'],
        correct: 1
      },
      completed: false
    },
    {
      id: 'troubleshooting',
      title: '🔧 Troubleshooting Guide',
      description: 'Solve common issues and optimize your experience',
      content: [
        'Song not loading? Check if songs exist in Song Manager first.',
        'Audio Analyzer not working? Enable microphone permissions in your browser.',
        'Lag or performance issues? Close other browser tabs and applications.',
        'Songs not saving? Ensure your browser allows local storage.',
        'Import not working? Check that the JSON file format is correct.',
        'Keys not responding? Make sure the game window has focus (click on it).',
        'Mobile controls not working? Switch to landscape orientation for best experience.',
        'No sound? Check your device volume and browser audio settings.',
        'Refresh the page if you encounter any unexpected behavior.',
        'Clear browser cache if songs or settings aren\'t loading properly.'
      ],
      quiz: {
        question: 'What orientation works best for mobile devices?',
        options: ['Portrait', 'Landscape', 'Both equally', 'Doesn\'t matter'],
        correct: 1
      },
      completed: false
    }
  ];

  const [lessonProgress, setLessonProgress] = useState(lessons);

  const handleQuizAnswer = (answerIndex: number) => {
    setQuizAnswer(answerIndex);
    setShowResult(true);
    
    if (selectedLesson && answerIndex === selectedLesson.quiz?.correct) {
      setLessonProgress(prev => 
        prev.map(lesson => 
          lesson.id === selectedLesson.id 
            ? { ...lesson, completed: true }
            : lesson
        )
      );
    }
  };

  const resetQuiz = () => {
    setQuizAnswer(null);
    setShowResult(false);
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20">
      {/* Lesson List - Scrollable Sidebar */}
      <div className="w-80 bg-black/40 backdrop-blur-sm border-r border-white/20 p-4 overflow-y-auto">
        <div className="flex items-center space-x-2 mb-6">
          <BookOpen className="text-purple-400" size={24} />
          <h2 className="text-white text-xl font-bold">Music Theory</h2>
        </div>

        {/* Progress Overview */}
        <div className="mb-6 p-3 bg-purple-900/30 rounded-lg border border-purple-400/30">
          <h3 className="text-white font-semibold mb-2">Your Progress</h3>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(lessonProgress.filter(l => l.completed).length / lessonProgress.length) * 100}%` }}
              />
            </div>
            <span className="text-white/70 text-sm">
              {lessonProgress.filter(l => l.completed).length}/{lessonProgress.length}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {lessonProgress.map((lesson, index) => (
            <motion.div
              key={lesson.id}
              className={`p-4 rounded-lg cursor-pointer border transition-all duration-200 ${
                selectedLesson?.id === lesson.id
                  ? 'bg-purple-600/30 border-purple-400'
                  : 'bg-white/10 border-white/20 hover:bg-white/20'
              }`}
              onClick={() => {
                setSelectedLesson(lesson);
                resetQuiz();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-white/70 text-sm">Lesson {index + 1}</span>
                    {lesson.completed && (
                      <CheckCircle className="text-green-400" size={16} />
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">{lesson.title}</h3>
                  <p className="text-white/70 text-xs">{lesson.description}</p>
                </div>
                <ArrowRight className={`text-white/50 transition-transform ${
                  selectedLesson?.id === lesson.id ? 'rotate-90' : ''
                }`} size={16} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lesson Content - Scrollable */}
      <div className="flex-1 p-8 overflow-y-auto">
        {selectedLesson ? (
          <motion.div
            key={selectedLesson.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-4">
                <h1 className="text-4xl font-bold text-white">{selectedLesson.title}</h1>
                {selectedLesson.completed && (
                  <div className="flex items-center space-x-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                    <CheckCircle size={18} />
                    <span className="text-sm font-semibold">Completed</span>
                  </div>
                )}
              </div>
              <p className="text-white/80 text-lg">{selectedLesson.description}</p>
            </div>

            {/* Content */}
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/10">
              <h3 className="text-white text-xl font-semibold mb-4 flex items-center space-x-2">
                <span>📖</span>
                <span>Lesson Content</span>
              </h3>
              <div className="space-y-4">
                {selectedLesson.content.map((paragraph, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start space-x-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="w-6 h-6 bg-purple-500/30 text-purple-300 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-white/90 leading-relaxed flex-1">
                      {paragraph}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <motion.div 
                className="bg-blue-900/30 backdrop-blur-sm rounded-lg p-4 border border-blue-400/30"
                whileHover={{ scale: 1.02 }}
              >
                <h4 className="text-blue-300 font-semibold mb-2">🎵 Try Song Manager</h4>
                <p className="text-white/70 text-sm">Create your first song and see these concepts in action!</p>
              </motion.div>
              
              <motion.div 
                className="bg-green-900/30 backdrop-blur-sm rounded-lg p-4 border border-green-400/30"
                whileHover={{ scale: 1.02 }}
              >
                <h4 className="text-green-300 font-semibold mb-2">🎮 Practice Mode</h4>
                <p className="text-white/70 text-sm">Apply what you learned in Piano Game mode!</p>
              </motion.div>
              
              <motion.div 
                className="bg-purple-900/30 backdrop-blur-sm rounded-lg p-4 border border-purple-400/30"
                whileHover={{ scale: 1.02 }}
              >
                <h4 className="text-purple-300 font-semibold mb-2">🎤 Audio Mode</h4>
                <p className="text-white/70 text-sm">Use Audio Analyzer to experiment with real sounds!</p>
              </motion.div>
            </div>

            {/* Quiz */}
            {selectedLesson.quiz && (
              <div className="bg-purple-900/30 backdrop-blur-sm rounded-lg p-6 border border-purple-400/30">
                <h3 className="text-white text-xl font-semibold mb-4">Quick Quiz</h3>
                
                <div className="mb-6">
                  <p className="text-white/90 mb-4">{selectedLesson.quiz.question}</p>
                  
                  <div className="space-y-2">
                    {selectedLesson.quiz.options.map((option, index) => (
                      <motion.button
                        key={index}
                        onClick={() => !showResult && handleQuizAnswer(index)}
                        disabled={showResult}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                          showResult
                            ? index === selectedLesson.quiz!.correct
                              ? 'bg-green-500/30 border-green-400 text-green-200'
                              : index === quizAnswer && index !== selectedLesson.quiz!.correct
                              ? 'bg-red-500/30 border-red-400 text-red-200'
                              : 'bg-gray-600/30 border-gray-500 text-gray-300'
                            : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                        }`}
                        whileHover={!showResult ? { scale: 1.02 } : {}}
                        whileTap={!showResult ? { scale: 0.98 } : {}}
                      >
                        {option}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center space-x-2">
                      {quizAnswer === selectedLesson.quiz.correct ? (
                        <>
                          <CheckCircle className="text-green-400" size={20} />
                          <span className="text-green-400 font-semibold">Correct! Well done!</span>
                        </>
                      ) : (
                        <>
                          <div className="w-5 h-5 rounded-full border-2 border-red-400 flex items-center justify-center">
                            <span className="text-red-400 text-sm">✕</span>
                          </div>
                          <span className="text-red-400 font-semibold">Try again next time!</span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={resetQuiz}
                      className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <motion.div 
              className="text-center max-w-2xl mx-auto p-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <BookOpen size={80} className="mx-auto mb-6 text-purple-400" />
              <h3 className="text-3xl font-bold text-white mb-4">Welcome to Music Theory! 🎵</h3>
              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                Learn everything about Pink Poong Piano, from basic gameplay to advanced Song Manager features. 
                Master the art of rhythm gaming and music creation!
              </p>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-900/30 backdrop-blur-sm rounded-lg p-6 border border-blue-400/30">
                  <div className="text-3xl mb-3">🎹</div>
                  <h4 className="text-blue-300 font-semibold mb-2">Piano Basics</h4>
                  <p className="text-white/70 text-sm">Learn the 15-key layout and fundamental concepts</p>
                </div>
                
                <div className="bg-green-900/30 backdrop-blur-sm rounded-lg p-6 border border-green-400/30">
                  <div className="text-3xl mb-3">🎵</div>
                  <h4 className="text-green-300 font-semibold mb-2">Song Creation</h4>
                  <p className="text-white/70 text-sm">Master the Song Manager and composition tools</p>
                </div>
                
                <div className="bg-purple-900/30 backdrop-blur-sm rounded-lg p-6 border border-purple-400/30">
                  <div className="text-3xl mb-3">🎮</div>
                  <h4 className="text-purple-300 font-semibold mb-2">Game Mastery</h4>
                  <p className="text-white/70 text-sm">Advanced techniques and pro strategies</p>
                </div>
              </div>
              
              <motion.p 
                className="text-purple-300 font-semibold"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ← Select a lesson from the sidebar to begin your musical journey!
              </motion.p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
} 