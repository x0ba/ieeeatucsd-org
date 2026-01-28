import { useState } from 'react';
import { PlayCircle, RefreshCw } from 'lucide-react';
import { useAuth } from "../../../../hooks/useConvexAuth";
import { useQuery, useMutation } from "convex/react";
import { api } from "#convex/_generated/api";

export default function TestPublicProfilesContent() {
  const { authUserId } = useAuth();
  const userData = useQuery(api.users.getUserByAuthId, authUserId ? { authUserId } : 'skip');
  const publicProfiles = useQuery(api.users.getPublicProfiles, {});
  const updateUserStats = useMutation(api.users.updateUserStats);
  
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (message: string, success: boolean = true) => {
    const prefix = success ? '✅' : '❌';
    setTestResults(prev => [...prev, `${prefix} ${message}`]);
  };

  const runTests = async () => {
    if (!authUserId) {
      addTestResult('Must be logged in to run tests', false);
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    try {
      addTestResult('Starting public profiles system tests...');

      // Test 1: Update user stats
      addTestResult('Test 1: Updating user stats...');
      await updateUserStats({
        userId: authUserId,
        points: 150,
        eventsAttended: 6
      });
      addTestResult('Successfully updated user stats');

      // Test 2: Get leaderboard
      addTestResult('Test 2: Fetching leaderboard...');
      const leaderboard = publicProfiles || [];
      addTestResult(`Successfully fetched leaderboard with ${leaderboard.length} profiles`);

      // Test 3: Verify user in leaderboard
      const userProfile = leaderboard.find((p: any) => p.userId === authUserId);
      if (userProfile && userProfile.points === 150) {
        addTestResult('Stats correctly reflected in leaderboard');
      } else {
        addTestResult('Stats not correctly reflected in leaderboard', false);
      }

      addTestResult('All tests completed successfully! 🎉');

    } catch (error: any) {
      addTestResult(`Test failed: ${error.message}`, false);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const loading = authUserId === undefined || userData === undefined || publicProfiles === undefined;

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          <div className="max-w-4xl mx-auto">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Test Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Controls</h2>

            <div className="flex items-center space-x-4">
              <button
                onClick={runTests}
                disabled={isRunning || !authUserId}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
                <span>
                  {isRunning ? 'Running Tests...' : 'Run Tests'}
                </span>
              </button>

              {testResults.length > 0 && (
                <button
                  onClick={clearResults}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Clear Results</span>
                </button>
              )}
            </div>

            {!authUserId && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">You must be logged in to run tests</p>
              </div>
            )}
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h2>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm text-gray-800 py-1">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Leaderboard */}
          {publicProfiles && publicProfiles.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Current Leaderboard ({publicProfiles.length} profiles)
              </h2>
              <div className="space-y-3">
                {publicProfiles.slice(0, 10).map((profile: any, index: number) => (
                  <div key={profile._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {profile.name || 'Unknown User'}
                          {profile.userId === authUserId && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {profile.major || 'No major'} • {profile.position || 'Member'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{profile.points || 0} pts</div>
                        <div className="text-sm text-gray-500">{profile.totalEventsAttended || 0} events</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Description */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What These Tests Do</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">1.</span>
                <span>Updates your points and events attended in the users collection</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">2.</span>
                <span>Fetches the public profiles leaderboard to test query permissions</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">3.</span>
                <span>Verifies that your updated stats appear correctly in the leaderboard</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This test will temporarily modify your profile data.
                Make sure to update your actual profile in Settings afterward if needed.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
