import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CompanySettings {
  id: string;
  name: string;
  logo_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  updated_at: string;
  logo_width?: number;
  logo_height?: number;
  maintain_ratio?: boolean;
  dropshipping_shipping_cost?: number;
}

// Default settings to use when no row exists
const defaultSettings: Omit<CompanySettings, 'id' | 'updated_at'> = {
  name: 'Calidad Premium',
  logo_url: null,
  hero_title: 'Productos de Calidad Premium',
  hero_subtitle: 'Descubre nuestra selección de productos exclusivos con la mejor calidad garantizada',
  logo_width: 200,
  logo_height: 60,
  maintain_ratio: true,
  dropshipping_shipping_cost: 0,
};

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
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Use the first row if exists
        setSettings(data[0]);
      } else {
        // If no settings exist, use default values
        console.log('No company settings found, using defaults');
        setSettings({
          id: 'default',
          updated_at: new Date().toISOString(),
          ...defaultSettings
        });
      }
      
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