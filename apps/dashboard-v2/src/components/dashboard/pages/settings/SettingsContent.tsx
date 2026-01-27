import React, { useState, useEffect } from 'react';
import { Save, Shield, UserCircle, Upload, FileText, AlertCircle, CheckCircle, Eye, EyeOff, LayoutDashboard, Sidebar, PanelTop } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../../hooks/useConvexAuth';
import { Skeleton } from '@heroui/react';
import { useNavigationPreference } from '../../shared/hooks/useNavigationPreference';
import type { NavigationLayout } from '../../shared/types/navigation';

export default function SettingsContent() {
  const { user, authUserId } = useAuth();
  const userData = useQuery(api.users.getUserByAuthUserId, authUserId ? { authUserId } : 'skip');
  
  const updateProfile = useMutation(api.users.updateProfile);
  const updateResume = useMutation(api.users.updateResume);
  const uploadFile = useMutation(api.storage.uploadFile);
  const getFileUrl = useQuery(api.storage.getFileUrl);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOAuthUser, setIsOAuthUser] = useState(false);

  // Navigation preference
  const { navigationLayout, setNavigationLayout, loading: navPrefLoading } = useNavigationPreference();
  const [savingNavPref, setSavingNavPref] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    pid: '',
    major: '',
    graduationYear: '',
    memberId: '',
    zelleInformation: ''
  });

  // Resume state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    if (!userData) return;

    setIsOAuthUser(userData.signInMethod !== 'email');

    setProfileData({
      name: userData.name || '',
      pid: userData.pid || '',
      major: userData.major || '',
      graduationYear: userData.graduationYear?.toString() || '',
      memberId: userData.memberId || '',
      zelleInformation: userData.zelleInformation || ''
    });

    setLoading(false);
  }, [userData]);

  const handleProfileUpdate = async () => {
    if (!authUserId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile({
        authUserId,
        name: profileData.name,
        pid: profileData.pid || undefined,
        major: profileData.major || undefined,
        graduationYear: profileData.graduationYear ? parseInt(profileData.graduationYear) : undefined,
        memberId: profileData.memberId || undefined,
        zelleInformation: profileData.zelleInformation || undefined,
      });

      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile || !authUserId) return;

    setUploadingResume(true);
    setError(null);
    setSuccess(null);

    try {
      const arrayBuffer = await resumeFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const result = await uploadFile({
        file: uint8Array,
        fileName: resumeFile.name,
        fileType: resumeFile.type,
      });

      await updateResume({
        authUserId,
        storageId: result.storageId,
      });

      setResumeFile(null);
      setSuccess('Resume uploaded successfully!');
    } catch (err: any) {
      setError('Failed to upload resume: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingResume(false);
    }
  };

  const handleResumeRemove = async () => {
    if (!authUserId || !userData?.resume) return;

    if (!confirm('Are you sure you want to remove your resume?')) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateResume({
        authUserId,
        storageId: undefined,
      });

      setSuccess('Resume removed successfully!');
    } catch (err: any) {
      setError('Failed to remove resume: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleNavigationLayoutChange = async (layout: NavigationLayout) => {
    setSavingNavPref(true);
    setError(null);
    setSuccess(null);

    try {
      await setNavigationLayout(layout);
      setSuccess('Navigation layout updated successfully! The page will reload to apply changes.');

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError('Failed to update navigation layout: ' + err.message);
    } finally {
      setSavingNavPref(false);
    }
  };

  const getResumeUrl = () => {
    if (typeof userData?.resume === 'string') {
      return userData.resume;
    }
    if (userData?.resume) {
      return getFileUrl({ storageId: userData.resume });
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <Skeleton className="h-6 w-32 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <Skeleton className="h-6 w-24 mb-6" />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center space-y-4">
                <Skeleton className="h-12 w-12 mx-auto rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48 mx-auto" />
                  <Skeleton className="h-3 w-32 mx-auto" />
                </div>
                <Skeleton className="h-10 w-24 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm md:text-base">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm md:text-base">{success}</span>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center space-x-3 mb-4 md:mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <UserCircle className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Profile Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px]"
                  placeholder="John Doe"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-base min-h-[44px]"
                  value={userData?.email || ''}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isOAuthUser
                    ? 'Email cannot be changed for OAuth users'
                    : 'Email cannot be changed'
                  }
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student ID (PID)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="A12345678"
                  value={profileData.pid}
                  onChange={(e) => setProfileData(prev => ({ ...prev, pid: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Major</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Computer Science"
                  value={profileData.major}
                  onChange={(e) => setProfileData(prev => ({ ...prev, major: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Graduation Year</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2025"
                  min="2024"
                  max="2030"
                  value={profileData.graduationYear}
                  onChange={(e) => setProfileData(prev => ({ ...prev, graduationYear: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IEEE Member ID (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345678"
                  value={profileData.memberId}
                  onChange={(e) => setProfileData(prev => ({ ...prev, memberId: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Zelle Information (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Phone number or email for reimbursements"
                  value={profileData.zelleInformation}
                  onChange={(e) => setProfileData(prev => ({ ...prev, zelleInformation: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleProfileUpdate}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center space-x-3 mb-4 md:mb-6">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-semibold text-gray-900">Navigation Layout</h2>
                <p className="text-xs md:text-sm text-gray-500">Choose your preferred navigation style</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleNavigationLayoutChange('horizontal')}
                disabled={savingNavPref || navPrefLoading}
                className={`relative p-6 border-2 rounded-lg transition-all text-left ${
                  navigationLayout === 'horizontal'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    navigationLayout === 'horizontal' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <PanelTop className={`w-6 h-6 ${
                      navigationLayout === 'horizontal' ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">Horizontal Navbar</h3>
                    <p className="text-sm text-gray-600">Traditional top navigation bar with dropdown menus</p>
                  </div>
                </div>
                {navigationLayout === 'horizontal' && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                )}
                <div className="mt-3 p-2 bg-white rounded border border-gray-200 h-28 w-full flex flex-col">
                  <div className="h-8 bg-[#0A2463] rounded flex items-center px-2 gap-1 mb-1.5 flex-shrink-0">
                    <div className="h-4 w-4 bg-white rounded-sm flex-shrink-0"></div>
                    <div className="flex gap-1 ml-auto">
                      <div className="h-2 w-8 bg-white/20 rounded"></div>
                      <div className="h-2 w-8 bg-white/10 rounded"></div>
                      <div className="h-2 w-8 bg-white/10 rounded"></div>
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded min-h-0"></div>
                </div>
              </button>

              <button
                onClick={() => handleNavigationLayoutChange('sidebar')}
                disabled={savingNavPref || navPrefLoading}
                className={`relative p-6 border-2 rounded-lg transition-all text-left ${
                  navigationLayout === 'sidebar'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    navigationLayout === 'sidebar' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Sidebar className={`w-6 h-6 ${
                      navigationLayout === 'sidebar' ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">Sidebar Navigation</h3>
                    <p className="text-sm text-gray-600">Collapsible sidebar with organized menu groups</p>
                  </div>
                </div>
                {navigationLayout === 'sidebar' && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                )}
                <div className="mt-3 p-2 bg-white rounded border border-gray-200 h-28 w-full flex gap-1.5">
                  <div className="w-20 bg-[#0A2463] rounded p-2 flex flex-col gap-1.5 flex-shrink-0">
                    <div className="h-3 bg-white rounded mb-1"></div>
                    <div className="space-y-1">
                      <div className="h-2 bg-white/20 rounded"></div>
                      <div className="h-2 bg-white/10 rounded"></div>
                      <div className="h-2 bg-white/10 rounded"></div>
                      <div className="h-2 bg-white/10 rounded"></div>
                    </div>
                    <div className="flex-1 min-h-0"></div>
                    <div className="h-3 bg-white/10 rounded"></div>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded min-h-0"></div>
                </div>
              </button>
            </div>

            {savingNavPref && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">Updating navigation layout...</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Resume</h2>
            </div>

            {userData?.resume ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Current Resume</p>
                      <p className="text-sm text-gray-500">Uploaded resume file</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const url = getResumeUrl();
                        if (url && typeof url === 'string') {
                          window.open(url, '_blank');
                        }
                      }}
                      className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={handleResumeRemove}
                      disabled={saving}
                      className="px-3 py-2 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Replace Resume</h3>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <button
                      onClick={handleResumeUpload}
                      disabled={!resumeFile || uploadingResume}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadingResume ? 'Uploading...' : 'Replace'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">No resume uploaded. Upload your resume for networking opportunities.</p>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <button
                    onClick={handleResumeUpload}
                    disabled={!resumeFile || uploadingResume}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{uploadingResume ? 'Uploading...' : 'Upload'}</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500">Accepted formats: PDF, DOC, DOCX</p>
              </div>
            )}
          </div>

          {isOAuthUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 text-blue-700">
                <Shield className="w-5 h-5" />
                <span className="font-medium">OAuth Account</span>
              </div>
              <p className="text-blue-600 mt-2">
                You signed in with an OAuth provider. To change your password, please visit your account settings on that provider's platform.
              </p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center space-x-3 mb-4 md:mb-6">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-semibold text-gray-900">Legal</h2>
                <p className="text-xs md:text-sm text-gray-500">Review our policies and terms</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-700">Terms of Service</p>
                    <p className="text-xs text-gray-500">Our terms and conditions</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-700">Privacy Policy</p>
                    <p className="text-xs text-gray-500">How we handle your data</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
