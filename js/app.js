let map;
let markers = [];
let infobox;
let selectedTypes = new Set();

async function fetchJSON(filePath) {
    const response = await fetch(filePath);
    return await response.json();
}

async function initMap() {
    const facilities = await fetchJSON('data/facilities.json');
    const facilityTypes = await fetchJSON('data/facility_types.json');
    const attributeDefinitions = await fetchJSON('data/attribute_definitions.json');

    const facilityButtonsContainer = document.getElementById('facility-buttons');
    const facilityInfoContainer = document.getElementById('facility-info');

    // Bing Maps の初期化（`index.js`から座標情報を取得）
    map = new Microsoft.Maps.Map(document.getElementById('map'), {
        center: new Microsoft.Maps.Location(initialCoordinates[0], initialCoordinates[1]),
        zoom: initialZoomLevel
    });

    // Infoboxの初期化
    infobox = new Microsoft.Maps.Infobox(map.getCenter(), { visible: false });
    infobox.setMap(map);

    // 施設分類ボタンを生成
    facilityTypes.facility_types.forEach(type => {
        const button = document.createElement('button');
        button.textContent = type.facility_type_name;
        button.style.backgroundColor = type.color;  // 色を設定
        button.onclick = () => {
            button.classList.toggle('selected');
            if (selectedTypes.has(type.facility_type_id)) {
                selectedTypes.delete(type.facility_type_id);
                button.style.backgroundColor = type.color;  // 選択解除時に元の色に戻す
            } else {
                selectedTypes.add(type.facility_type_id);
                button.style.backgroundColor = darkenColor(type.color);  // 選択時に色を変更
            }
            showFacilities(selectedTypes, facilities, attributeDefinitions, facilityTypes);
        };
        facilityButtonsContainer.appendChild(button);
    });

    function darkenColor(color) {
        const amount = 3;  // より暗くするために数値を調整
        const colorObj = Microsoft.Maps.Color.fromHex(color);
        const darkenedColor = new Microsoft.Maps.Color(
            colorObj.a,
            Math.max(0, colorObj.r - amount),
            Math.max(0, colorObj.g - amount),
            Math.max(0, colorObj.b - amount)
        );
        return darkenedColor.toHex();
    }

    function showFacilities(typeIds, facilities, attributeDefinitions, facilityTypes) {
        clearMarkers();
        typeIds.forEach(typeId => {
            const selectedFacilityType = facilityTypes.facility_types.find(type => type.facility_type_id === typeId);
            facilities.facilities
                .filter(facility => facility.facility_type_id === typeId)
                .forEach(facility => addMarker(facility, attributeDefinitions, selectedFacilityType.color));
        });
    }

    function addMarker(facility, attributeDefinitions, color) {
        const location = new Microsoft.Maps.Location(facility.latitude, facility.longitude);
        const pin = new Microsoft.Maps.Pushpin(location, { color: color });  // マーカーの色を設定

        // 予備1～10で定義済の項目を表示
        const additionalInfo = attributeDefinitions.attribute_definitions.map(attr => `
            <div><strong>${attr.reserve_name}:</strong> ${facility[`reserve${attr.attribute_id}`]}</div>
        `).join('');

        pin.metadata = {
            title: facility.facility_name,
            description: `
                <b>施設名:</b> ${facility.facility_name}<br>
                <b>住所:</b> ${facility.address}<br>
                ${additionalInfo}
            `,
            isVisible: false
        };

        Microsoft.Maps.Events.addHandler(pin, 'click', function () {
            if (pin.metadata.isVisible) {
                infobox.setOptions({ visible: false });
                pin.metadata.isVisible = false;
            } else {
                infobox.setOptions({
                    location: location,
                    title: '',
                    description: pin.metadata.description,
                    visible: true
                });
                pin.metadata.isVisible = true;
            }
        });

        map.entities.push(pin);
        markers.push(pin);
    }

    function clearMarkers() {
        markers.forEach(marker => map.entities.remove(marker));
        markers = [];
    }
}

document.addEventListener('DOMContentLoaded', initMap);
