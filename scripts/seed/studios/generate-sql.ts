/**
 * スタジオシードデータをSQL INSERT文に変換するスクリプト
 */

import { allStudioSeedData } from './data';

// テストユーザーID（organizer）
const CREATED_BY = '33cf6da6-9572-4473-aa10-1cc8eeaf258d'; // プロフィールから取得したorganizer ID

function escapeSqlString(str: string | undefined | null): string {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSql() {
  console.log('-- スタジオシードデータ投入SQL');
  console.log(`-- データ件数: ${allStudioSeedData.length}件\n`);

  // バッチ処理（100件ずつ）
  const batchSize = 100;

  for (let i = 0; i < allStudioSeedData.length; i += batchSize) {
    const batch = allStudioSeedData.slice(i, i + batchSize);

    console.log(
      `-- バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(allStudioSeedData.length / batchSize)}`
    );
    console.log('INSERT INTO studios (');
    console.log(
      '  name, description, address, prefecture, city, access_info, phone, email, website_url,'
    );
    console.log(
      '  latitude, longitude, total_area, max_capacity, parking_available, wifi_available,'
    );
    console.log(
      '  business_hours, regular_holidays, hourly_rate_min, hourly_rate_max,'
    );
    console.log(
      '  normalized_name, normalized_address, created_by, verification_status'
    );
    console.log(') VALUES');

    const values = batch.map((studio, idx) => {
      const businessHoursJson = studio.business_hours
        ? `'${JSON.stringify(studio.business_hours).replace(/'/g, "''")}'::jsonb`
        : 'NULL';
      const regularHolidaysArray =
        studio.regular_holidays && studio.regular_holidays.length > 0
          ? `ARRAY[${studio.regular_holidays.map(h => `'${h.replace(/'/g, "''")}'`).join(', ')}]`
          : 'NULL';
      const normalizedName = studio.name.toLowerCase();
      const normalizedAddress = studio.address.toLowerCase();

      return `  (${escapeSqlString(studio.name)}, ${escapeSqlString(studio.description)}, ${escapeSqlString(studio.address)}, ${escapeSqlString(studio.prefecture)}, ${escapeSqlString(studio.city)}, ${escapeSqlString(studio.access_info)}, ${escapeSqlString(studio.phone)}, ${escapeSqlString(studio.email)}, ${escapeSqlString(studio.website_url)}, ${studio.latitude}, ${studio.longitude}, ${studio.total_area}, ${studio.max_capacity}, ${studio.parking_available}, ${studio.wifi_available}, ${businessHoursJson}, ${regularHolidaysArray}, ${studio.hourly_rate_min}, ${studio.hourly_rate_max}, ${escapeSqlString(normalizedName)}, ${escapeSqlString(normalizedAddress)}, '${CREATED_BY}', 'verified')${idx < batch.length - 1 ? ',' : ''}`;
    });

    console.log(values.join('\n'));
    console.log(';\n');
  }
}

generateSql();
