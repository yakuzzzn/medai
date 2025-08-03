import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import {
  Edit3,
  Save,
  Play,
  Pause,
  Volume2,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Calendar
} from 'lucide-react';
import { Draft, SOAPData, ConfidenceScores } from '../../../shared/types';
import { api } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';

interface DraftViewerProps {
  draftId: string;
}

const DraftViewer: React.FC<DraftViewerProps> = ({ draftId }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSoap, setEditedSoap] = useState<SOAPData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch draft data
  const { data: draftData, isLoading, error } = useQuery(
    ['draft', draftId],
    () => api.get(`/v1/drafts/${draftId}`),
    {
      onSuccess: (data) => {
        setEditedSoap(data.draft.soapData);
      }
    }
  );

  // Update draft mutation
  const updateMutation = useMutation(
    (updatedDraft: Partial<Draft>) => api.put(`/v1/drafts/${draftId}`, updatedDraft),
    {
      onSuccess: () => {
        toast.success('Draft updated successfully');
        queryClient.invalidateQueries(['draft', draftId]);
        setIsEditing(false);
      },
      onError: () => {
        toast.error('Failed to update draft');
      }
    }
  );

  // Sync to EHR mutation
  const syncMutation = useMutation(
    () => api.post('/v1/ehr/sync', { draftId }),
    {
      onSuccess: () => {
        toast.success('Draft synced to EHR successfully');
        queryClient.invalidateQueries(['drafts']);
      },
      onError: () => {
        toast.error('Failed to sync to EHR');
      }
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Failed to load draft</div>
      </div>
    );
  }

  const draft = draftData?.draft;
  const transcript = draftData?.transcript;
  const audio = draftData?.audio;

  const handleSave = () => {
    if (!editedSoap) return;
    
    updateMutation.mutate({
      soapData: editedSoap
    });
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Draft Note</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              Dr. {draft?.userId}
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDistanceToNow(new Date(draft?.createdAt || ''), { addSuffix: true })}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {audio?.durationSeconds}s recording
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isEditing 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            <span>{isEditing ? 'Save' : 'Edit'}</span>
          </button>
          
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={updateMutation.isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          
          <button
            onClick={handleSync}
            disabled={syncMutation.isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {syncMutation.isLoading ? 'Syncing...' : 'Sync to EHR'}
          </button>
        </div>
      </div>

      {/* Audio Player */}
      {audio && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Volume2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Audio Recording</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{Math.floor(currentTime)}s</span>
                <span>{duration}s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOAP Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {['subjective', 'objective', 'assessment', 'plan'].map((section) => (
          <div key={section} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold capitalize text-gray-900">
                {section}
              </h3>
              <div className="flex items-center space-x-2">
                {getConfidenceIcon(draft?.confidenceScores?.[section as keyof ConfidenceScores] || 0)}
                <span className={`text-sm font-medium ${
                  getConfidenceColor(draft?.confidenceScores?.[section as keyof ConfidenceScores] || 0)
                }`}>
                  {Math.round((draft?.confidenceScores?.[section as keyof ConfidenceScores] || 0) * 100)}%
                </span>
              </div>
            </div>
            
            {isEditing ? (
              <textarea
                value={editedSoap?.[section as keyof SOAPData] || ''}
                onChange={(e) => setEditedSoap(prev => ({
                  ...prev!,
                  [section]: e.target.value
                }))}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Enter ${section} information...`}
              />
            ) : (
              <div className="bg-white p-3 rounded-lg border border-gray-200 min-h-[8rem]">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {draft?.soapData?.[section as keyof SOAPData] || 'No content available'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Coding Suggestions */}
      {(draft?.icdCodes?.length || draft?.rxCodes?.length) && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Coding Suggestions</h3>
          
          {draft?.icdCodes?.length && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">ICD-10 Codes</h4>
              <div className="flex flex-wrap gap-2">
                {draft.icdCodes.map((code, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {code.code}: {code.description}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {draft?.rxCodes?.length && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">RxNorm Codes</h4>
              <div className="flex flex-wrap gap-2">
                {draft.rxCodes.map((code, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {code.code}: {code.description}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raw Transcript */}
      {transcript && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Raw Transcript</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Word Error Rate: {Math.round((transcript.wordErrorRate || 0) * 100)}%
              </span>
              <span className="text-sm text-gray-600">
                Confidence: {Math.round((transcript.confidenceScore || 0) * 100)}%
              </span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">
              {transcript.rawText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftViewer; 