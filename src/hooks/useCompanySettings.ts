import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CompanySettings {
  id: string;
  name: string;
  logo_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  updated_at: string;
}

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
      setError(null);
    } catch (error: any) {
      console.error('Error loading company settings:', error);
      setError('Error loading company settings');
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, error, reload: loadSettings };
}